
const maxFileSize = 512 * 1024;

import * as fs from 'fs';
import * as Pako from 'pako';

fs.readdir('./mm/', (dirErr, files) => {

    if (dirErr) {
        console.error(dirErr);
    }

    files.forEach((filename) => {

        let fileCount = 0;

        function createWriteStream() {
            ++fileCount;
            let sFileCount: string = fileCount.toString();
            while (sFileCount.length < 3) {
                sFileCount = '0' + sFileCount;
            }

            const stream = fs.createWriteStream('./public/' + filename + '.gz.' + sFileCount, {encoding: 'binary'});

            stream.on('error', (writeError) => {
                console.error(writeError);
                process.exit(1);
            });

            return stream;
        }

        const deflate = new Pako.Deflate({gzip: true, to: 'string', header: {name: filename}} as Pako.DeflateOptions);
        const readStream = fs.createReadStream('./mm/' + filename, {encoding: 'binary'});
        let writeStream = createWriteStream();
        let bytesWritten = 0;

        readStream.on('data', (data) => {
            deflate.push(data, false);
        });

        readStream.on('error', (readError) => {
            console.error(readError);
            process.exit(1);
        });

        readStream.on('end', () => {
            deflate.push(Buffer.from([]), true);
        });

        deflate.onData = (chunk: Pako.Data ) => {
            if (bytesWritten + chunk.length > maxFileSize) {
                const endChunk = chunk.slice(0, maxFileSize - bytesWritten);
                writeStream.write(endChunk);
                writeStream.end();
                writeStream = createWriteStream();
                bytesWritten = 0;
                chunk = chunk.slice(endChunk.length);
            }

            writeStream.write(chunk);
            bytesWritten += chunk.length;
        };

        deflate.onEnd = (status: number) => {
            writeStream.end();
        };

    });

});

