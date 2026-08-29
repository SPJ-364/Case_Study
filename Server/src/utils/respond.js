export const ok = (res, data, meta) =>
  res.json(meta ? { success: true, data, meta } : { success: true, data });

export const created = (res, data) => res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).send();
