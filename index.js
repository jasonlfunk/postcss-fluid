const postcss = require('postcss');

const PLUGIN_NAME = 'postcss-fluid-type';

const pi = (o) => parseInt(o, 10);
const pf = (o) => parseFloat(o);

module.exports = (opts = {}) => {
  return {
    postcssPlugin: PLUGIN_NAME,
    Once(root) {
      const $opts = Object.assign(
        {
          functionName: 'fluid-type',
        },
        opts
      );
      const regex = new RegExp(`${$opts.functionName}\\(([^)]+)\\)`, 'gi');

      const mediaMin = [];
      const mediaMax = [];

      root.walkDecls((decl) => {
        if (decl.value.indexOf(`${$opts.functionName}(`) === -1) {
          return;
        }

        let from = decl.value.replace(regex, (_, values) => values.split(',').map((a) => a.trim())[0]);
        let to = decl.value.replace(regex, (_, values) => values.split(',').map((a) => a.trim())[1]);
        let min = decl.value.replace(regex, (_, values) => values.split(',').map((a) => a.trim())[2]);
        let max = decl.value.replace(regex, (_, values) => values.split(',').map((a) => a.trim())[3]);

        decl.value = decl.value.replace(regex, (_, values /*, index*/) => {
          const { from, to, minVal, maxVal } = parseValues(values);
          return `calc(${minVal} + ${pf(maxVal) - pf(minVal)} * (100vw - ${from}) / ${pi(to) - pi(from)})`;
        });

        mediaMin.push({
          selector: decl.parent.selector,
          prop: decl.prop,
          value: min,
        });

        mediaMax.push({
          selector: decl.parent.selector,
          prop: decl.prop,
          value: max,
        });
      });

      if (mediaMin.length) {
        addMediaRule(root, `(max-width: ${from})`, mediaMin);
      }

      if (mediaMax.length) {
        addMediaRule(root, `(min-width: ${to})`, mediaMax);
      }
    }
  }
}

function addMediaRule(root, params, children) {
  const m = postcss.atRule({ name: 'media', params });

  let selectors = {};

  for (let ch of children) {
    if (!selectors[ch.selector]) {
      selectors[ch.selector] = [{ prop: ch.prop, value: ch.value }];
    } else {
      selectors[ch.selector].push({ prop: ch.prop, value: ch.value });
    }
  }

  for (let selector in selectors) {
    const r = postcss.rule({ selector: selector });

    for (let i of selectors[selector]) {
      const v = postcss.decl({ prop: i.prop, value: i.value });
      r.append(v);
    }

    m.append(r);
  }

  root.append(m);
}

function parseValues(values) {
  const $values = values.split(',').map((a) => a.trim());

  return {
    from: $values[0],
    to: $values[1],
    minVal: $values[2],
    maxVal: $values[3],
  };
}
