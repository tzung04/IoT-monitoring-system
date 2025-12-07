import * as React from 'react';

export default function logReactInfo() {
  try {
    console.groupCollapsed('React debug info');
    console.log('React.version:', React.version);
    console.log('typeof useContext:', typeof React.useContext);
    console.log('useContext === undefined?', React.useContext === undefined);

    // Devtools hook info
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook) {
      try {
        console.log('React devtools hook present');
        console.log('renderers keys:', Object.keys(hook.renderers || {}));
      } catch (err) {
        console.log('Error reading devtools hook:', err);
      }
    } else {
      console.log('React devtools hook: not present');
    }

    // Try to detect multiple React copies by comparing symbols
    try {
      const sym = Symbol.for('react.element');
      console.log('Symbol.for("react.element") exists:', !!sym);
    } catch (e) {
      console.log('Symbol.for("react.element") error', e);
    }

    console.groupEnd();
  } catch (e) {
    // swallow
    // eslint-disable-next-line no-console
    console.error('logReactInfo failed', e);
  }
}
