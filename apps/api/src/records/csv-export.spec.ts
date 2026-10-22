import { createCsv, csvCell } from './csv-export.js';

describe('exportación CSV', () => {
  it('encierra celdas y escapa comillas, comas y saltos de línea', () => {
    expect(csvCell('Café "Las Olas", Centro\nMazatlán')).toBe(
      '"Café ""Las Olas"", Centro\nMazatlán"',
    );
  });

  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '  =HYPERLINK()', '＝1+1'])(
    'neutraliza la fórmula %s',
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    },
  );

  it('genera UTF-8 con BOM y finales de línea compatibles con CSV', () => {
    expect(
      createCsv([
        ['Nombre', 'Interés'],
        ['Cafetería', 'Alto'],
      ]),
    ).toBe('\uFEFF"Nombre","Interés"\r\n"Cafetería","Alto"\r\n');
  });
});
