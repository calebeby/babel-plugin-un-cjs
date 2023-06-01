module.exports = {
  testRegex: 'tests/.*\\.(md|ts|js)$',
  transform: {
    '\\.md$': './jest-transform',
    '\\.ts$': '@sucrase/jest-plugin',
  },
  moduleFileExtensions: ['js', 'md', 'ts'],
  testEnvironment: 'node',
}
