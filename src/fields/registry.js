import * as text from './text.js';
import * as textarea from './textarea.js';
import * as number from './number.js';
import * as booleanField from './boolean.js';
import * as datetime from './datetime.js';
import * as enumField from './enum.js';
import * as json from './json.js';
import * as richtext from './richtext.js';

/**
 * Widget contract: `create(column, value, overrides)` returns
 * `{ el: HTMLElement, getValue: () => any }`. `getValue` may throw a
 * user-readable Error (e.g. invalid JSON).
 */
const registry = {
  text,
  textarea,
  number,
  boolean: booleanField,
  datetime,
  enum: enumField,
  json,
  richtext,
};

/** Extension point for user-provided widgets (via supacrud.config.js). */
export function registerWidget(name, widget) {
  registry[name] = widget;
}

export function widgetFor(column, overrides = {}) {
  const key = overrides.widget ?? inferWidget(column);
  return registry[key] ?? registry.text;
}

/** Maps PostgREST column type/format to a widget name. */
export function inferWidget(column) {
  if (column.enumValues) return 'enum';
  if (column.type === 'boolean') return 'boolean';
  if (column.type === 'integer' || column.type === 'number') return 'number';
  if (column.format.startsWith('timestamp') || column.format === 'date') return 'datetime';
  if (column.format === 'json' || column.format === 'jsonb') return 'json';
  if (column.format === 'text') return 'textarea';
  return 'text';
}
