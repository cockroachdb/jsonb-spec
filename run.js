var deepEqual = require('deep-equal');
var pg = require('pg-promise')();
var chalk = require('chalk');
var fs = require('fs'); 

const dbName = 'runnerdb';

async function run(fnames) {
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

        await runCommands(db, commands(contents));
        pg.end();
    }
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
            .andThen(() => checkValues(result, test.expectedResults));
    case 'statement':
        try {
            await db.none(q);
            return Success();
        } catch (e) {
            return Failure(e.message);
        }
    }
    return Failure(`unknown command ${test.command}`)
}

async function runCommands(db, cs, depth=0) {
    let spacing = '  '.repeat(depth);
    for (let c of cs) {
        if (c.type === 'subsection') {
            console.log(chalk.cyan.italic(`${spacing} # ${c.header}`))
            await runCommands(db, c.subtests, depth + 1);
        } else {
            let test = c.test;
            (await executeTest(db, test)).andThen(() => {
                console.log(chalk.green(` ${spacing}✔  ${test.name}`))
                return Success();
            }).catch(e => {
                console.log(chalk.red(` ${spacing}✗  ${test.name}`))
                console.log(chalk.red(` ${spacing}   ${e.split('\n').join('\n    ')}`))
            });
        }
    }
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
    while (lines.length > 0) {
        let line = lines.shift();
        while (line !== undefined && !line.match(/^ /)) {
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
        while (line !== undefined && line.match(/^ /)) {
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

run(process.argv.slice(2))