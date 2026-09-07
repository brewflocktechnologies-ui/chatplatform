import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn()
}));

import { getDb } from '@/lib/mongodb';
import {
  getWidgetConfigs,
  getWidgetConfig,
  createWidgetConfig,
  renameWidgetConfig,
  saveWidgetConfigCdn,
  deleteWidgetConfig
} from '@/features/widget-modifier/api/service';

const ID = '507f1f77bcf86cd799439013';

function makeConfigsCollection() {
  const cursor = {
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([])
  };
  return {
    cursor,
    find: vi.fn().mockReturnValue(cursor),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId(ID) }),
    updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  };
}

function makeWebsitesCollection() {
  return {
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 })
  };
}

let configs: ReturnType<typeof makeConfigsCollection>;
let websites: ReturnType<typeof makeWebsitesCollection>;

beforeEach(() => {
  vi.clearAllMocks();
  configs = makeConfigsCollection();
  websites = makeWebsitesCollection();
  vi.mocked(getDb).mockResolvedValue({
    collection: vi.fn((name: string) => (name === 'websites' ? websites : configs))
  } as never);
});

describe('getWidgetConfigs', () => {
  it('fetches all configs sorted by updatedAt desc', async () => {
    const result = await getWidgetConfigs();

    expect(configs.find).toHaveBeenCalledWith({});
    expect(configs.cursor.sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Configs fetched successfully');
    expect(result.configs).toEqual([]);
  });

  it('serializes docs covering name, configName and cdnConfig fallbacks', async () => {
    const idA = new ObjectId('507f1f77bcf86cd799439001');
    const idB = new ObjectId('507f1f77bcf86cd799439002');
    const idC = new ObjectId('507f1f77bcf86cd799439003');
    configs.cursor.toArray.mockResolvedValue([
      { _id: idA, name: 'Alpha', configName: 'AlphaCfg', cdnConfig: { color: 'red' } },
      { _id: idB, configName: 'Beta' },
      { _id: idC }
    ]);

    const result = await getWidgetConfigs();

    expect(result.configs[0]).toMatchObject({
      id: idA.toString(),
      name: 'Alpha',
      configName: 'AlphaCfg',
      cdnConfig: { color: 'red' }
    });
    expect(result.configs[1]).toMatchObject({
      id: idB.toString(),
      name: 'Beta',
      configName: 'Beta',
      cdnConfig: {}
    });
    expect(result.configs[2]).toMatchObject({
      id: idC.toString(),
      name: 'Untitled',
      configName: 'Untitled',
      cdnConfig: {}
    });
  });
});

describe('getWidgetConfig', () => {
  it('returns null for an invalid ObjectId without touching the db', async () => {
    await expect(getWidgetConfig('not-an-id')).resolves.toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('returns the serialized config when found', async () => {
    configs.findOne.mockResolvedValue({ _id: new ObjectId(ID), name: 'Alpha', cdnConfig: {} });
    const result = await getWidgetConfig(ID);

    expect(configs.findOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) });
    expect(result).toMatchObject({ id: ID, name: 'Alpha', configName: 'Alpha' });
  });

  it('returns null when no document matches', async () => {
    configs.findOne.mockResolvedValue(null);
    await expect(getWidgetConfig(ID)).resolves.toBeNull();
  });
});

describe('createWidgetConfig', () => {
  it('throws when the name is blank', async () => {
    await expect(createWidgetConfig('   ')).rejects.toThrow('Config name is required');
  });

  it('throws when a config with the same name exists', async () => {
    configs.findOne.mockResolvedValue({ _id: new ObjectId(ID), name: 'Alpha' });
    await expect(createWidgetConfig('Alpha')).rejects.toThrow(
      'A configuration named "Alpha" already exists'
    );
    expect(configs.insertOne).not.toHaveBeenCalled();
  });

  it('trims the name and inserts a config with an empty cdnConfig', async () => {
    const result = await createWidgetConfig('  My Config  ');

    expect(configs.findOne).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: '^My Config$', $options: 'i' } },
        { configName: { $regex: '^My Config$', $options: 'i' } }
      ]
    });
    expect(configs.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Config',
        configName: 'My Config',
        cdnConfig: {},
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    );
    expect(result).toMatchObject({ id: ID, name: 'My Config', cdnConfig: {} });
  });

  it('escapes regex special characters in the duplicate check', async () => {
    await createWidgetConfig('a.b*c(d)');

    expect(configs.findOne).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: '^a\\.b\\*c\\(d\\)$', $options: 'i' } },
        { configName: { $regex: '^a\\.b\\*c\\(d\\)$', $options: 'i' } }
      ]
    });
  });
});

describe('renameWidgetConfig', () => {
  it('throws when the name is blank', async () => {
    await expect(renameWidgetConfig(ID, '  ')).rejects.toThrow('Config name is required');
  });

  it('throws when the config does not exist', async () => {
    configs.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(renameWidgetConfig(ID, 'New Name')).rejects.toThrow(`Config ${ID} not found`);
    expect(websites.updateMany).not.toHaveBeenCalled();
  });

  it('renames the config and syncs the denormalized website fields', async () => {
    const result = await renameWidgetConfig(ID, '  New Name ');

    expect(configs.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(ID) },
      {
        $set: {
          name: 'New Name',
          configName: 'New Name',
          updatedAt: expect.any(String)
        }
      }
    );
    expect(websites.updateMany).toHaveBeenCalledWith(
      { configId: ID },
      { $set: { configName: 'New Name', flavour: 'New Name' } }
    );
    expect(result).toEqual({ success: true, message: 'Config renamed successfully' });
  });
});

describe('saveWidgetConfigCdn', () => {
  it('throws when the config does not exist', async () => {
    configs.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(saveWidgetConfigCdn(ID, { a: 1 })).rejects.toThrow(`Config ${ID} not found`);
  });

  it('saves the cdnConfig payload', async () => {
    const cdnConfig = { theme: 'dark', position: 'right' };
    const result = await saveWidgetConfigCdn(ID, cdnConfig);

    expect(configs.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(ID) },
      { $set: { cdnConfig, updatedAt: expect.any(String) } }
    );
    expect(result).toEqual({ success: true, message: 'Config saved successfully' });
  });
});

describe('deleteWidgetConfig', () => {
  it('throws when nothing was deleted and does not touch websites', async () => {
    configs.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(deleteWidgetConfig(ID)).rejects.toThrow(`Config ${ID} not found`);
    expect(websites.updateMany).not.toHaveBeenCalled();
  });

  it('deletes the config and unlinks referencing websites', async () => {
    const result = await deleteWidgetConfig(ID);

    expect(configs.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) });
    expect(websites.updateMany).toHaveBeenCalledWith(
      { configId: ID },
      { $unset: { configId: '' }, $set: { configName: '' } }
    );
    expect(result).toEqual({ success: true, message: 'Config deleted successfully' });
  });
});
