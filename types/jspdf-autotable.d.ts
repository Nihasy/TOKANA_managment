declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface AutoTableOptions {
    startY?: number
    head?: any[][]
    body?: any[][]
    theme?: 'striped' | 'grid' | 'plain'
    headStyles?: any
    bodyStyles?: any
    columnStyles?: any
    alternateRowStyles?: any
    margin?: { left?: number; right?: number; top?: number; bottom?: number }
    [key: string]: any
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void

  global {
    namespace jsPDF {
      interface jsPDF {
        lastAutoTable: {
          finalY: number
        }
      }
    }
  }
}

