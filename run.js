var deepEqual = require('deep-equal');
var pg = require('pg-promise')();
var chalk = require('chalk');
var fs = require('fs'); 

const dbName = 'runnerdb';

run(process.argv.slice(2))

async function run(fnames) {
    let results = {
        numTests: 0,
        numPasses: 0
    }
    for (let fname of fnames) {
        let db = pg({
            host: 'localhost',
            port: '5432',
            database: 'justin'
        });

        await db.none(`DROP DATABASE IF EXISTS ${dbName}`);
        await db.none(`CREATE DATABASE ${dbName}`);

        // reconnect to this new database
        db = pg({
            host: 'localhost',
            port: '5432',
            database: dbName
        });

        let contents = fs.readFileSync(fname).toString();

        let result = await runCommands(db, commands(contents));
        results.numTests += result.numTests;
        results.numPasses += result.numPasses;
        pg.end();
    }

    console.log();
    if (results.numPasses === results.numTests) {
        console.log(chalk.bold.gray(`🍕  ${results.numPasses}/${results.numTests} tests passed 🍕  nice!`));
    } else {
        console.log(chalk.bold.red(`${results.numPasses}/${results.numTests} tests passed`));
    }
    console.log();
}

let Success = x => ({
    andThen(f) { return f(x); },
    catch(f) { return Success(x); }
});
let Failure = e => ({
    andThen(f) { return Failure(e); },
    catch(f) { return f(e); }
});

async function executeTest(db, test) {
    let q = new pg.ParameterizedQuery(test.query);
    // By default values arrive as objects and we can't recover the ordering of the result columns.
    q.rowMode = 'array';
    switch (test.command) {
    case 'query':
        let result = await db.many(q);
        return Success()
            .andThen(() => checkTypeString(result, test.args[0]))
            .andThen(() => checkValues(result, test.expectedResults))
            .andThen(() => Success({type: 'pass'}));
    case 'statement':
        if (test.args[0] === 'ok') {
            try {
                await db.none(q);
                return Success({type: 'pass'});
            } catch (e) {
                return Failure(e.message);
            }
        } else if (test.args[0] === 'error') {
            try {
                await db.none(q);
                return Failure();
            } catch (e) {
                let expectedMessage = test.args.slice(1).join(' ');
                let actualMessage = e.message.split(/\s+/).join(' ');
                if (actualMessage === expectedMessage) {
                    return Success({type: 'pass'});
                } else {
                    return Failure(`expected error message to be '${expectedMessage}', but was '${actualMessage}'`);
                }
            }
        }
    case 'todo':
        return Success({type: 'todo', message: `TODO: ${test.name}`});
    }
    return Failure(`unknown command ${test.command}`)
}

async function runCommands(db, cs, depth=0) {
    let spacing = '  '.repeat(depth);
    let numTests = 0;
    let numPasses = 0;
    for (let c of cs) {
        if (c.type === 'subsection') {
            console.log(chalk.gray.italic(`${spacing} # ${c.header}`))
            let results = await runCommands(db, c.subtests, depth + 1);
            numTests += results.numTests;
            numPasses += results.numPasses;
        } else {
            numTests++;
            let test = c.test;
            (await executeTest(db, test)).andThen(({type}) => {
                if (type === 'pass') {
                    console.log(chalk.green(` ${spacing}✔ `) + chalk.dim.cyan(` ${test.name}`));
                    numPasses++;
                } else if (type === 'todo') {
                    console.log(` ${spacing}🤔  ` + chalk.bold.yellow(`TODO: ${test.name}`));
                    numTests--;
                }
                return Success();
            }).catch(e => {
                console.log(chalk.red(` ${spacing}✗  ${test.name}`))
                console.log(chalk.red(` ${spacing}   ${e.split('\n').join('\n    ')}`))
            });
        }
    }
    return { numTests, numPasses };
}

function checkTypeString(result, typeString) {
    if (result[0].length < typeString.length) {
        return Failure(`expected ${typeString}, but result has ${result[0].length} columns`);
    }
    for (let t of typeString) {
        switch (t) {
            case 'T':
            // everything satisfies T
        }
    }
    return Success();
}

function formatResult(result) {
    return result.map(r => r.map(d => JSON.stringify(d)).join(' ')).join('\n');
}

function columnize(row) {
    return [row];
}

function checkValues(result, expected) {
    if (result.length !== expected.length) {
        return Failure(`expected ${expected.length} result rows, got:
----
${formatResult(result)}
`)
    }
    for (let i = 0; i < result.length; i++) {
        let cols = columnize(expected[i]);
        for (let c = 0; c < cols.length; c++) {
            let expectedJson = JSON.parse(cols[c]);
            if (!deepEqual(result[i][c], expectedJson)) {
                return Failure(`!deepEqual(${result[i][c]}, ${expectedJson})`);
            }
        }
    }
    return Success();
}

function parseQuery(lines) {
    let name = lines[0].replace(/:$/, '');
    let [command, ...args] = lines[1].split(/\s+/);
    let query = '';
    let i = 2;
    for (; lines[i] && !lines[i].match(/^-+$/); i++) {
        query += lines[i];
    }
    let expectedResults = lines.slice(i + 1);

    return {
        name,
        command,
        args,
        query,
        expectedResults
    }
}

function *parseLines(lines, depth) {
    let i = 0;
    let currentQuery = [];
    let line = lines.shift();
    while (lines.length > 0) {
        while (line !== undefined && !line.match(/^\s+\S/)) {
            if (line.match(/^#+/)) {
                let newDepth = line.match(/^(#+)/)[1].length;
                if (depth >= newDepth) {
                    // shove er back in there
                    lines.unshift(line);
                    return;
                } else {
                    yield {
                        type: 'subsection',
                        header: line.replace(/^#+ +/, ''),
                        subtests: [...parseLines(lines, depth + 1)]
                    };
                }
            }
            line = lines.shift();
        }
        while (line !== undefined && line.match(/^\s+\S/)) {
            if (!line.match(/^\s+$/)) {
                currentQuery.push(line.replace(/^\s+/, ''));
            }
            line = lines.shift();
        }
        if (currentQuery.length > 0) {
            yield {
                type: 'test',
                test: parseQuery(currentQuery)
            }
            currentQuery = [];
        }
    }
}

function *commands(contents) {
    let lines = contents.split('\n');
    yield *parseLines(lines, 0);
}