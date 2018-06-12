
import * as fs from 'fs';
import * as Pako from 'pako';

fs.readdir(__dirname + '/mm/', (dirErr, files) => {

    if (dirErr) {
        console.error(dirErr);
    }

    files.forEach((filename) => {

        const deflate = new Pako.Deflate({gzip: true, to: 'string'} as Pako.DeflateOptions);
        const readStream = fs.createReadStream(__dirname + '/mm/' + filename, {encoding: 'binary'});
        const writeStream = fs.createWriteStream(__dirname + '/public/' + filename + '.gz', {encoding: 'binary'});

        readStream.on('data', (data) => {
            deflate.push(data, false);
        });

        readStream.on('error', (readError) => {
            console.error(readError);
            process.exit(1);
        });

        readStream.on('end', () => {
            deflate.push('', true);
        });

        deflate.onData = (chunk: Pako.Data ) => {
            writeStream.write(chunk);
        };

        deflate.onEnd = (status: number) => {
            writeStream.end();
        };

        writeStream.on('error', (writeError) => {
            console.error(writeError);
            process.exit(1);
        });
    });

});

