
import * as fs from 'fs';
import * as Pako from 'pako';

fs.readdir(__dirname + '/mm/', (dirErr, files) => {

    if (dirErr) {
        console.error(dirErr);
    }

    files.forEach((filename) => {

        fs.readFile(__dirname + '/mm/' + filename, (err, dataIn) => {

            if (err) {
                console.error(err);
                process.exit(1);
            }

            const dataOut = Pako.gzip(dataIn, {to: 'string'});
            fs.writeFile(__dirname + '/public/' + filename + '.gz', dataOut, {encoding: 'binary'}, () => {});
        });

    });

});

