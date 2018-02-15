import fs from 'fs';
import yaml from 'js-yaml';
import process from 'child_process';

const readdir = (path) => new Promise((resolve) => fs.readdir(path, (error, files) => resolve(files)));

function type(type) {
    if (type === 'integer') return 'number';
    if (type === 'bool') return 'boolean';
    if (type === 'float') return 'number';
    if (type === 'int') return 'number';
    if (type === 'array') return 'array[object]'
    return type;
}

function objectToApib(object, n) {

    let result = '';

    let required = object.required === 'yes' ? ', required' : '';

    let example = `: ${object.type} `;

    // 配列なら値の例を表記しない
    if (object.type === 'array') {
        example = ' ';
        required = '';
    }

    result += '    '.repeat(n) + `+ ${object.param}${example}(${type(object.type)}${required})`;

    
    // 配列ならオブジェクトを追加する
    if (object.type === 'array') {
        example = '';

        result += '\n' + '    '.repeat(n + 1) + '+ (object)';

        ++n;
    }

    try {
        if (object.type === 'array') {
            for (const param of object[object.param]) {
                result += '\n' + objectToApib(param, n + 1);
            }
        }
    } catch (e) {
        console.log("Error: " + object.param);
    }

    return result;
}


function toApib(yaml) {

    if (yaml.controller === 'common') return;

    console.log('-'.repeat(100));
    console.log(`${yaml.controller}/${yaml.action}`);
    console.log(yaml);

    for (const param of yaml.in) {
        console.log(objectToApib(param, 1));
    }

    return `

## ${yaml.summary}${yaml.description} [/${yaml.controller}/${yaml.action}]

+ Parameters
${yaml.in.map((param) => objectToApib(param, 1)).join('\n')}

### ${yaml.action} [POST]

+ Response 200 (application/json)
 
    + Attributes
${yaml.out.map((param) => objectToApib(param, 2)).join('\n')}


    `;
}

(async () => {

    const files = await readdir('./yaml');

    const yamls = files
        .filter((file) => file.endsWith('.yaml'))
        // .filter((file) => file.includes('assets'))
        .map((file) => fs.readFileSync('yaml/' + file, 'utf8'))
        .map((file) => yaml.safeLoad(file))
        .sort((a, b) => a.controller.localeCompare(b.controller));

    let document = `
    
FORMAT: 1A
# API Document
    
    `;

    let controller = '';

    for (const yaml of yamls) {

        if (yaml.controller !== controller) {
            controller = yaml.controller;
            document += `\n# Group ${controller}`;
        }

        const apib = toApib(yaml);
        document += apib;
    }

    fs.writeFile('./dest/api.apib', document);

    process.exec('npm run build', (...args) => {
        console.log(args);
    });

})();