import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export async function syncSequence(name, seqValue) {
  if (typeof seqValue === 'number' && Number.isFinite(seqValue) && seqValue > 0) {
    await Counter.findByIdAndUpdate(
      name,
      { $max: { seq: seqValue } },
      { upsert: true }
    );
  }
}

export function attachAutoIncrement(schema, counterName) {
  schema.pre('save', async function (next) {
    if (!this.id) {
      let nextId = await getNextSequence(counterName);
      const maxDoc = await this.constructor
        .findOne({ id: { $type: 'number' } })
        .sort({ id: -1 })
        .select('id')
        .lean();
      if (maxDoc && typeof maxDoc.id === 'number' && nextId <= maxDoc.id) {
        await syncSequence(counterName, maxDoc.id);
        nextId = await getNextSequence(counterName);
      }
      this.id = nextId;
    } else if (this.isNew) {
      await syncSequence(counterName, this.id);
    }
    next();
  });
}

export default Counter;
