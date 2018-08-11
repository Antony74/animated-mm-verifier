
import * as superagent from 'superagent';
import * as fs from 'fs';

if (process.argv.length !== 4) {
    console.log('usage: node get.js <url> <filename>');
    process.exit();
}

const url: string = process.argv[2];
const filename: string = process.argv[3];

console.log('Getting ' + url);

superagent.get(url).end((responseError: superagent.ResponseError, response: superagent.Response) => {
    if (responseError) {
        console.log(responseError.message);
    } else {
        fs.writeFile(filename, response.body, (fileError: NodeJS.ErrnoException) => {
            if (fileError) {
                console.log(fileError.message);
            } else {
                console.log('Done');
            }
        });
    }
});

