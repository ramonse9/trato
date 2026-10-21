import { AppController } from './app.controller.js';
import { AppService, HealthResponse } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let appService: { getHealth: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appService = { getHealth: vi.fn() };
    appController = new AppController(appService as unknown as AppService);
  });

  describe('health', () => {
    it('devuelve el estado de la aplicación', async () => {
      const response: HealthResponse = {
        status: 'ok',
        database: 'up',
        timestamp: '2026-10-21T18:00:00.000Z',
        timezone: 'America/Mazatlan',
      };
      appService.getHealth.mockResolvedValue(response);

      await expect(appController.getHealth()).resolves.toEqual(response);
    });
  });
});
