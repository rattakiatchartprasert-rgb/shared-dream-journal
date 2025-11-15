// index.js (ฉบับแก้ไข "อมตะ" - กรองค่า null)

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const dataFile = path.join(__dirname, 'dreams.json');

// in-memory store
let dreams = [];

// --- (ส่วนโหลดข้อมูลที่อัปเกรด) ---
try {
  if (fs.existsSync(dataFile)) {
    const data = fs.readFileSync(dataFile);
    if (data.length > 0) {
      let loadedDreams = JSON.parse(data);
      if (Array.isArray(loadedDreams)) {
        dreams = loadedDreams.filter(d => d && typeof d === 'object');
      }
    }
  }
} catch (e) {
  console.error('Error reading dreams.json (likely corrupted):', e);
}
// --- (จบส่วนโหลด) ---

// ฟังก์ชันเซฟข้อมูลลงไฟล์
function saveDreams() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(dreams, null, 2));
  } catch (e) {
    console.error('Error writing to dreams.json:', e);
  }
}

const cors = require('cors');
app.use(cors());
app.use(express.json());

// CREATE dream
app.post('/dreams', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: 'Title and content are required' });

  const now = new Date().toISOString();
  const newId = dreams.length > 0 ? Math.max(...dreams.map((d) => (d.id || 0))) + 1 : 1;

  const dream = {
    id: newId,
    title,
    content,
    timestamp: now,
    updatedAt: now,
  };

  dreams.push(dream);
  saveDreams(); // สร้างไฟล์ dreams.json ใหม่
  res.status(201).json(dream);
});

// READ all dreams
app.get('/dreams', (req, res) => {
  try { 
    const { keyword, sort, page = 1, limit = 10 } = req.query;
    let result = dreams.filter(d => d && typeof d === 'object');

    // 1) filter
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      result = result.filter(
        (d) =>
          (d.title && typeof d.title === 'string' && d.title.toLowerCase().includes(kw)) ||
          (d.content && typeof d.content === 'string' && d.content.toLowerCase().includes(kw))
      );
    }

    // 2) sort
    const getDate = (dream) => {
      if (!dream) return new Date(0); 
      const date = new Date(dream.updatedAt || dream.timestamp);
      if (isNaN(date.getTime())) return new Date(0); 
      return date;
    };
    if (sort === 'latest') {
      result = [...result].sort((a, b) => getDate(b) - getDate(a));
    } else if (sort === 'oldest') {
      result = [...result].sort((a, b) => getDate(a) - getDate(b));
    }

    // 3) pagination
    const total = result.length;
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const start = (p - 1) * l;
    const end = start + l;
    const paginated = result.slice(start, end);

    res.json({
      page: p,
      limit: l,
      total: total,
      dreams: paginated,
    });
  } catch (error) {
    console.error('Error in GET /dreams:', error);
    res.status(500).json({ error: 'Server error during sort/filter' });
  }
});

// READ one dream by id
app.get('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const dream = dreams.find((d) => d && d.id === id);
  if (!dream) return res.status(404).json({ error: 'Dream not found' });
  res.json(dream);
});

// UPDATE dream
app.put('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  const index = dreams.findIndex(d => d && d.id === id);

  if (index === -1) return res.status(404).json({ error: 'Dream not found' });
  
  const dream = dreams[index];
  if (title) dream.title = title;
  if (content) dream.content = content;
  dream.updatedAt = new Date().toISOString();

  saveDreams();
  res.json(dream);
});

// DELETE dream
app.delete('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = dreams.findIndex(d => d && d.id === id);

  if (index === -1) return res.status(404).json({ error: 'Dream not found' });

  const [removed] = dreams.splice(index, 1);
  saveDreams();
  res.json({ deleted: removed });
});

app.use(express.static('public'));

// start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});