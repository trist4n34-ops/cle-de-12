import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { deleteMyData, LOCAL_KEYS } from '@/lib/delete-data';

const mockRemoved: string[][] = [];
const mockApiDelete = jest.fn<() => Promise<{ deleted: true }>>();
const mockApplied: unknown[][] = [];

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiRemove: async (keys: string[]) => {
      mockRemoved.push(keys);
    },
    getItem: async () => null,
    setItem: async () => undefined,
  },
}));
jest.mock('@/lib/api', () => ({ api: { deleteMyData: () => mockApiDelete() }, clearApiSession: () => undefined }));
jest.mock('@/lib/reminder-scheduler', () => ({
  applyReminders: async (plan: unknown[]) => {
    mockApplied.push(plan);
    return true;
  },
}));

describe('Supprimer mes données', () => {
  beforeEach(() => {
    mockRemoved.length = 0;
    mockApplied.length = 0;
    mockApiDelete.mockReset();
  });

  it('efface le serveur, annule les rappels puis vide le téléphone', async () => {
    mockApiDelete.mockResolvedValue({ deleted: true });
    await deleteMyData({ hasServerSession: true });
    expect(mockApiDelete).toHaveBeenCalledTimes(1);
    expect(mockApplied).toEqual([[]]);
    expect(mockRemoved).toEqual([[...LOCAL_KEYS]]);
  });

  it("n'appelle pas le serveur sans session enregistrée", async () => {
    await deleteMyData({ hasServerSession: false });
    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(mockRemoved).toHaveLength(1);
  });

  it("n'efface rien sur le téléphone si le serveur échoue", async () => {
    mockApiDelete.mockRejectedValue(new Error('offline'));
    await expect(deleteMyData({ hasServerSession: true })).rejects.toThrow('offline');
    expect(mockRemoved).toHaveLength(0);
    expect(mockApplied).toHaveLength(0);
  });
});
