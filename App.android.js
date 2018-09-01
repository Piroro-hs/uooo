import React, {Component} from 'react';
import {NativeModules, Text, View} from 'react-native';

export default class App extends Component {
  constructor() {
    super();
    this.state = {
      message: 'Hello from JS',
    };
  }

  componentDidMount() {
    const {HelloWorld} = NativeModules;
    HelloWorld.helloJava().then(message => {
      this.setState({message: `${this.state.message}\n${message}`});
    });
    HelloWorld.helloNdk().then(message => {
      this.setState({message: `${this.state.message}\n${message}`});
    });
  }

  render() {
    return (
      <View>
        <Text>{this.state.message}</Text>
      </View>
    );
  }
}
