import { JsonValue, JsonObject, JsonArray } from '@/types';
import { IGNORED_PROPERTIES } from '@/App';

interface ComparisonResult {
  similarityPercentage: number;
  matchingProperties: number;
  totalProperties: number;
}

function compareObjects(
  obj1: JsonValue,
  obj2: JsonValue,
  ignoredProperties: string[] = IGNORED_PROPERTIES
): ComparisonResult {
  // Helper function to check if a value is a JsonObject
  const isJsonObject = (value: JsonValue): value is JsonObject => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };

  // Helper function to check if a value is a JsonArray
  const isJsonArray = (value: JsonValue): value is JsonArray => {
    return Array.isArray(value);
  };

  // Helper function to get comparable properties
  const getComparableProps = (obj: JsonObject): string[] => {
    return Object.keys(obj).filter(key => !ignoredProperties.includes(key));
  };

  // Helper function to count total properties recursively
  function countProperties(value: JsonValue, counted: Set<JsonValue> = new Set()): number {
    if (!isJsonObject(value) && !isJsonArray(value)) {
      return 1;
    }

    if (counted.has(value)) {
      return 0;
    }
    counted.add(value);

    if (isJsonArray(value)) {
      //@ts-ignore
      return value.reduce((sum, item) => sum + countProperties(item, counted), 0);
    }

    const props = getComparableProps(value);
    return props.reduce((sum, prop) => {
      const propValue = value[prop];
      return sum + countProperties(propValue, counted);
    }, 0);
  }

  // Helper function to count matching properties recursively
  function countMatches(
    value1: JsonValue,
    value2: JsonValue,
    counted: Set<JsonValue> = new Set()
  ): number {
    // Handle primitive types
    if (
      !isJsonObject(value1) &&
      !isJsonArray(value1) &&
      !isJsonObject(value2) &&
      !isJsonArray(value2)
    ) {
      return value1 === value2 ? 1 : 0;
    }

    // Handle arrays
    if (isJsonArray(value1) && isJsonArray(value2)) {
      if (counted.has(value1)) return 0;
      counted.add(value1);

      let matches = 0;
      for (let i = 0; i < value1.length; i++) {
        if (i < value2.length) {
          matches += countMatches(value1[i], value2[i], counted);
        }
      }
      return matches;
    }

    // Handle objects
    if (isJsonObject(value1) && isJsonObject(value2)) {
      if (counted.has(value1)) return 0;
      counted.add(value1);

      const props1 = getComparableProps(value1);
      
      return props1.reduce((matches, prop) => {
        if (!(prop in value2)) return matches;
        return matches + countMatches(value1[prop], value2[prop], counted);
      }, 0);
    }

    // If types don't match
    return 0;
  }

  // Calculate total properties from obj1 only
  const totalProps = countProperties(obj1);

  // Calculate matching properties
  const matchingProps = countMatches(obj1, obj2);

  // Calculate similarity percentage
  const similarityPercentage = totalProps === 0
    ? 100
    : (matchingProps / totalProps) * 100;

  return {
    similarityPercentage: Math.round(similarityPercentage * 100) / 100,
    matchingProperties: matchingProps,
    totalProperties: totalProps
  };
}

export { compareObjects };