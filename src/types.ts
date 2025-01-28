type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type DiffStatus = 'same' | 'added' | 'removed' | 'modified';
type FileType = 'pre-process' | 'post-process';

export {
  type JsonValue,
  type JsonArray,
  type JsonObject,
  type DiffStatus,
  type FileType
}