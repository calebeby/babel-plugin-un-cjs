module.exports = {
  testRegex: 'tests/.*\\.(md|ts|js)$',
  transform: {
    '\\.md$': './jest-transform',
    '\\.ts$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'md', 'ts'],
  testEnvironment: 'node',
  testRunner: 'jest-circus/runner',
}
