declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFInfo {
    [key: string]: any;
  }

  interface PDFMetadata {
    [key: string]: any;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PDFData>;

  export default pdfParse;
}
