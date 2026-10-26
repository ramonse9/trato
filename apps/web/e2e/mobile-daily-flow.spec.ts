import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('permite el flujo diario esencial desde un teléfono', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('navegador@trato.test');
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('trato-navegador-2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cambiar proyecto' }).click();
  await page.getByRole('option', { name: 'Ruta Costa', exact: true }).click();
  await expect(page.getByText('Ruta Costa', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal móvil' })).toBeVisible();

  await page.getByRole('link', { name: 'Contactos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prospectos y clientes' })).toBeVisible();
  const mobileCards = page.locator('.mobile-cards');
  await expect(mobileCards.getByText('7 - Cliente', { exact: true }).first()).toBeVisible();
  await expect(mobileCards.getByText('2 - Contactado', { exact: true }).first()).toBeVisible();
  const recordNames = page.locator('.mobile-cards .record-card-link .card-heading > strong');
  await expect(page.getByRole('combobox', { name: 'Orden de registro' })).toContainText(
    'Primeros registrados',
  );
  await expect(recordNames).toHaveText(['Cafetería Las Olas', 'Pan del Puerto']);
  await page.getByRole('combobox', { name: 'Orden de registro' }).click();
  await page.getByRole('option', { name: 'Últimos registrados' }).click();
  await expect(recordNames).toHaveText(['Pan del Puerto', 'Cafetería Las Olas']);
  await page.getByRole('combobox', { name: 'Orden de registro' }).click();
  await page.getByRole('option', { name: 'Primeros registrados' }).click();
  await expect(recordNames).toHaveText(['Cafetería Las Olas', 'Pan del Puerto']);
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar contacto' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir WhatsApp' }).first()).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\d+$/u,
  );
  await expect(page.getByRole('link', { name: 'Abrir ubicación' }).first()).toHaveAttribute(
    'href',
    /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/u,
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^trato-.*\.csv$/u);
  expect(path).not.toBeNull();
  const csv = await readFile(path!, 'utf8');
  expect(csv).toContain('"Nombre del negocio"');
  expect(csv).toContain('"Cafetería Las Olas"');

  await page.getByRole('link', { name: 'Registrar contacto' }).first().click();
  await expect(page.getByRole('heading', { name: 'Cafetería Las Olas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuevo contacto' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Código de país' })).toHaveValue('+52');
  await page.getByRole('textbox', { name: 'Número de teléfono' }).fill('667 123 45 67');
  await page
    .getByRole('textbox', { name: 'Coordenadas (latitud, longitud)' })
    .fill('24.782805612467623, -107.43111031811513');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Ficha actualizada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Número de teléfono' })).toHaveValue('6671234567');
  await expect(page.getByRole('textbox', { name: 'Coordenadas (latitud, longitud)' })).toHaveValue(
    '24.782806, -107.43111',
  );
  await page
    .getByRole('textbox', { name: 'Resumen', exact: true })
    .fill('Visita registrada desde móvil');
  await page.getByRole('button', { name: 'Guardar contacto' }).click();
  await expect(page.getByRole('status')).toContainText('Contacto y seguimiento guardados.');
  await expect(page.getByText('Visita registrada desde móvil', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Seguimientos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seguimientos', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible();

  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
});
