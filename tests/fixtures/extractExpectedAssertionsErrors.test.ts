import transform from '../../test-util'

// based on https://unpkg.com/expect@24.8.0/build/extractExpectedAssertionsErrors.js

test('extractExpectedAssertionsErrors', async () => {
  const input = `
exports.default = void 0;

var _jestMatcherUtils = require('jest-matcher-utils');

var _jestMatchersObject = require('./jestMatchersObject');

const resetAssertionsLocalState = () => {
  (0, _jestMatchersObject.setState)();
};

const extractExpectedAssertionsErrors = () => {
  const _getState = (0, _jestMatchersObject.getState)(),
    assertionCalls = _getState.assertionCalls,
    expectedAssertionsNumber = _getState.expectedAssertionsNumber,
    expectedAssertionsNumberError = _getState.expectedAssertionsNumberError,
    isExpectingAssertions = _getState.isExpectingAssertions,
    isExpectingAssertionsError = _getState.isExpectingAssertionsError;

  resetAssertionsLocalState();

  if (
    typeof expectedAssertionsNumber === 'number' &&
    assertionCalls !== expectedAssertionsNumber
  ) {
    const numOfAssertionsExpected = (0, _jestMatcherUtils.EXPECTED_COLOR)(
      (0, _jestMatcherUtils.pluralize)('assertion', expectedAssertionsNumber)
    );
  }

  if (isExpectingAssertions && assertionCalls === 0) {
    const expected = (0, _jestMatcherUtils.EXPECTED_COLOR)(
      'at least one assertion'
    );
    const received = (0, _jestMatcherUtils.RECEIVED_COLOR)('received none');
  }

  return result;
};

var _default = extractExpectedAssertionsErrors;
exports.default = _default;
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _default2 = {}
    import * as _jestMatcherUtils from 'jest-matcher-utils'
    import * as _jestMatchersObject from './jestMatchersObject'
    _default2.default = void 0

    const resetAssertionsLocalState = () => {
      _jestMatchersObject.setState()
    }

    const extractExpectedAssertionsErrors = () => {
      const _getState = _jestMatchersObject.getState(),
        assertionCalls = _getState.assertionCalls,
        expectedAssertionsNumber = _getState.expectedAssertionsNumber,
        expectedAssertionsNumberError = _getState.expectedAssertionsNumberError,
        isExpectingAssertions = _getState.isExpectingAssertions,
        isExpectingAssertionsError = _getState.isExpectingAssertionsError

      resetAssertionsLocalState()

      if (
        typeof expectedAssertionsNumber === 'number' &&
        assertionCalls !== expectedAssertionsNumber
      ) {
        const numOfAssertionsExpected = _jestMatcherUtils.EXPECTED_COLOR(
          _jestMatcherUtils.pluralize('assertion', expectedAssertionsNumber),
        )
      }

      if (isExpectingAssertions && assertionCalls === 0) {
        const expected = _jestMatcherUtils.EXPECTED_COLOR('at least one assertion')

        const received = _jestMatcherUtils.RECEIVED_COLOR('received none')
      }

      return result
    }

    var _default = extractExpectedAssertionsErrors
    export { _default as default }
    _default2.default = _default
    "
  `)
})
