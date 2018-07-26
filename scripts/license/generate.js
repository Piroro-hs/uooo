const {readFile, writeFile} = require('fs');
const {resolve: resolvePath} = require('path');
const {promisify} = require('util');

const request = require('request');

const getLicenseText = async ({type, content}) =>
  // prettier-ignore
  (await (
    type === 'file' ? promisify(readFile)(content, 'utf8') :
    type === 'url'  ? new Promise((resolve, reject) => {
      request(content, (error, _, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    }) :
    type === 'text' ? content : ''
  )).replace(/(?:^[\n\r]+)|(?:[\n\r]+$)/g, '');

const createLicenseNotice = groupedLicenses =>
  `THIRD PARTY SOFTWARE NOTICES AND INFORMATION
Following softwares may be included in this product.

${Array.from(groupedLicenses)
    .sort(
      // prettier-ignore
      (a, b) => a[1].sort().join().toUpperCase() > b[1].sort().join().toUpperCase() ? 1 : -1,
    )
    .map(([key, value]) => {
      const [url, licenseText] = JSON.parse(key);
      return `
--------------------------------------------------------------------------------
${value.join(', ')}
${url}
--------------------------------------------------------------------------------

${licenseText}
`;
    })
    .join('\n')}`;

(async () => {
  const {npm, gradle, external} = JSON.parse(
    await promisify(readFile)(resolvePath(__dirname, 'licenses.json')),
  );
  const licenses = [...npm, ...gradle, ...external].filter(({skip}) => !skip);
  if (licenses.some(({url, license}) => !url || !license)) {
    // throw new Error('Missing required field in license.json');
    console.error('Missing required field in license.json');
    return;
  }
  const licenseTexts = licenses.reduce(
    (acc, {license}) =>
      !acc.has(`${license.type}${license.content}`)
        ? acc.set(`${license.type}${license.content}`, getLicenseText(license))
        : acc,
    new Map(),
  );
  const licensesWithText = await Promise.all(
    licenses.map(async ({name, url, license: {type, content}}) => ({
      name,
      url,
      licenseText: await licenseTexts.get(`${type}${content}`),
    })),
  );
  const groupedLicenses = licensesWithText.reduce(
    (acc, {name, url, licenseText}) =>
      acc.set(JSON.stringify([url, licenseText]), [
        ...(acc.get(JSON.stringify([url, licenseText])) || []),
        name,
      ]),
    new Map(),
  );
  const licenseNotice = createLicenseNotice(groupedLicenses);
  await Promise.all([
    promisify(writeFile)(resolvePath(__dirname, 'LicenseNotice.txt'), licenseNotice),
    promisify(writeFile)(
      resolvePath('src/lib/license/licenseNotice.json'),
      JSON.stringify({text: licenseNotice}),
    ),
  ]);
})();
