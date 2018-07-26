const {spawn} = require('child_process');
const {readFile, unlink, writeFile} = require('fs');
const {resolve: resolvePath} = require('path');
const {promisify} = require('util');

const checker = require('license-checker');
const webpack = require('webpack');

const retriveNpm = async () => {
  const stats = await promisify(webpack)({
    mode: 'none',
    entry: './index.js',
    output: {
      path: __dirname,
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
        },
      ],
      noParse: [/node_modules(\/|\\)react-native(\/|\\)/, /\.(?!js|json)[^./]+$/],
    },
  });
  await promisify(unlink)(resolvePath(__dirname, 'bundle.js')).catch(() => {});
  const npmDeps = stats
    .toJson({chunks: true})
    .chunks[0].modules.map(({reasons: [{userRequest}]}) => {
      const splited = userRequest.split('/');
      return userRequest.startsWith('@') ? `${splited[0]}/${splited[1]}` : splited[0];
    })
    .filter((name, index, names) => name !== '.' && names.indexOf(name) === index);
  return Object.entries(await promisify(checker.init)({start: resolvePath(__dirname, '../..')}))
    .filter(([key]) => npmDeps.some(name => key.startsWith(`${name}@`)))
    .sort()
    .map(([key, {repository: url, licenseFile}]) => ({
      name: /(.+)@\d+\.\d+\.\d+(|-[0-9A-Za-z-]+|\+[0-9A-Za-z-]+)$/.exec(key)[1],
      url,
      license: licenseFile ? {type: 'file', content: licenseFile} : null,
    }))
    .filter(({name}, index, entries) => entries.findIndex(({name: n}) => name === n) === index);
};

const retriveGradle = async () => {
  await new Promise(resolve => {
    spawn('gradlew', ['licenseReleaseReport'], {
      cwd: resolvePath('android'),
      shell: true,
    }).on('exit', resolve);
  });
  return JSON.parse(
    await promisify(readFile)(
      resolvePath('android/app/build/reports/licenses/licenseReleaseReport.json'),
      'utf8',
    ),
  ).map(({project: name, url, licenses: [{license_url: licenseUrl} = {}]}) => {
    const gitHubRegExp = /^(?:|http(?:|s):\/\/)github.com\/([\w-.]+\/[\w-.]+)\/blob/i;
    return {
      name,
      url,
      license: gitHubRegExp.test(licenseUrl)
        ? {
            type: 'url',
            content: licenseUrl.replace(gitHubRegExp, 'https://raw.githubusercontent.com/$1'),
          }
        : null,
    };
  });
};

(async () => {
  const jsonPath = resolvePath(__dirname, 'licenses.json');
  const {npm = [], gradle = [], external = []} = JSON.parse(
    await promisify(readFile)(jsonPath).catch(() => '{}'),
  );
  const [npmRetrived, gradleRetrived] = await Promise.all([retriveNpm(), retriveGradle()]);
  await promisify(writeFile)(
    resolvePath(__dirname, 'licensesRetrived.json'),
    JSON.stringify({npm: npmRetrived, gradle: gradleRetrived}, null, 2),
  );
  const licensesMaps = [npm, gradle].map(
    licenses => new Map(licenses.map(({name, ...entry}) => [name, {...entry}])),
  );
  const [npmUpdated, gradleUpdated] = [npmRetrived, gradleRetrived].map((retrived, index) =>
    retrived.map(({name, url, license}) => {
      if (licensesMaps[index].has(name)) {
        const entry = licensesMaps[index].get(name);
        const {override} = entry;
        return {
          name,
          ...entry,
          ...(url && !override ? {url} : {}),
          ...(license && !override ? {license} : {}),
        };
      }
      return {name, url, license};
    }),
  );
  await promisify(writeFile)(
    jsonPath,
    JSON.stringify({npm: npmUpdated, gradle: gradleUpdated, external}, null, 2),
  );
})();
