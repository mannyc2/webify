import { describe, expect, test } from "bun:test";
import {
  extractBalancedObject,
  safeJsonParse,
} from "../parsing/script-extract";

// ---------------------------------------------------------------------------
// extractBalancedObject
// ---------------------------------------------------------------------------

describe("extractBalancedObject", () => {
  test("simple object", () => {
    const text = '{"key": "value"}';
    expect(extractBalancedObject(text, 0)).toBe('{"key": "value"}');
  });

  test("nested objects", () => {
    const text = '{"a": {"b": 1}}';
    expect(extractBalancedObject(text, 0)).toBe('{"a": {"b": 1}}');
  });

  test("strings with braces inside", () => {
    const text = '{"key": "{not a brace}"}';
    expect(extractBalancedObject(text, 0)).toBe('{"key": "{not a brace}"}');
  });

  test("escaped quotes in strings", () => {
    const text = '{"key": "she said \\"hello\\""}';
    expect(extractBalancedObject(text, 0)).toBe('{"key": "she said \\"hello\\""}');
  });

  test("unterminated object returns null", () => {
    const text = '{"key": "value"';
    expect(extractBalancedObject(text, 0)).toBeNull();
  });

  test("empty string returns null", () => {
    expect(extractBalancedObject("", 0)).toBeNull();
  });

  test("array at start returns null (not an object)", () => {
    const text = '[1, 2, 3]';
    expect(extractBalancedObject(text, 0)).toBeNull();
  });

  test("object with trailing text", () => {
    const text = '{"a":1} extra stuff';
    expect(extractBalancedObject(text, 0)).toBe('{"a":1}');
  });

  test("object starting at non-zero index", () => {
    const text = 'var x = {"a":1};';
    const idx = text.indexOf("{");
    expect(extractBalancedObject(text, idx)).toBe('{"a":1}');
  });
});

// ---------------------------------------------------------------------------
// safeJsonParse
// ---------------------------------------------------------------------------

describe("safeJsonParse", () => {
  test("valid JSON returns parsed object", () => {
    const result = safeJsonParse('{"key": "value", "num": 42}');
    expect(result).toEqual({ key: "value", num: 42 });
  });

  test("invalid JSON returns null", () => {
    expect(safeJsonParse("{broken")).toBeNull();
    expect(safeJsonParse("not json")).toBeNull();
  });

  test("empty string returns null", () => {
    expect(safeJsonParse("")).toBeNull();
  });
});
