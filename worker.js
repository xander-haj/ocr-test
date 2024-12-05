// worker.js
// Web Worker script handling the OCR processing using Tesseract.js

importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js');

onmessage = function (e) {
    let { imageData, lang } = e.data;
    Tesseract.recognize(
        imageData,
        lang,
        { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        postMessage({ text });
    }).catch(err => {
        console.error(err);
        postMessage({ text: 'Error: ' + err.message });
    });
};
