const shardCache = new Map();

export async function lookupZip(zip) {
  if (!/^\d{5}$/.test(zip)) throw new Error('invalid-zip');
  const prefix = zip[0];
  if (!shardCache.has(prefix)) {
    shardCache.set(prefix, fetch(`data/zip/${prefix}.json?v=1`).then((response) => {
      if (!response.ok) throw new Error('zip-data-unavailable');
      return response.json();
    }).catch((error) => {
      shardCache.delete(prefix);
      throw error;
    }));
  }
  const shard = await shardCache.get(prefix);
  const record = shard[zip];
  if (!record) throw new Error('zip-not-found');
  const [place, region, lat, lon] = record;
  return { zip, place, region, lat: Number(lat), lon: Number(lon) };
}
