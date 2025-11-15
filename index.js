const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const dataFile = path.join(__dirname, 'dreams.json');

// in-memory store
let dreams = [];

// โหลดข้อมูลจากไฟล์ ถ้ามี
if (fs.existsSync(dataFile)) {
  dreams = JSON.parse(fs.readFileSync(dataFile));
}

// ฟังก์ชันเซฟข้อมูลลงไฟล์
function saveDreams() {
  fs.writeFileSync(dataFile, JSON.stringify(dreams, null, 2));
}

const cors = require('cors');
app.use(cors());

app.use(express.json());

// health check
app.get('/', (req, res) => {
  res.send('Shared Dream Journal server is running...');
});

// CREATE dream
app.post('/dreams', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const now = new Date().toISOString();
  const dream = { 
    id: dreams.length + 1, 
    title, 
    content,
    timestamp: now,       // เวลาแรกสร้าง
    updatedAt: now        // เวลาแก้ไขล่าสุด (ตอนสร้าง = เวลาเดียวกัน)
  };

  dreams.push(dream);
  saveDreams();
  res.status(201).json(dream);
});

// READ all dreams (search + sort + pagination)
app.get('/dreams', (req, res) => {
  const { keyword, sort, page = 1, limit = 10 } = req.query;

  // 1) filter ด้วย keyword (ถ้ามี)
  let result = dreams;
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    result = result.filter(d =>
      (d.title && d.title.toLowerCase().includes(kw)) ||
      (d.content && d.content.toLowerCase().includes(kw))
    );
  }

  // 2) sort ตามเวลา (ถ้ามี)
  if (sort === 'latest') {
    result = [...result].sort((a, b) => new Date(b.updatedAt || b.timestamp) - new Date(a.updatedAt || a.timestamp));
  } else if (sort === 'oldest') {
    result = [...result].sort((a, b) => new Date(a.updatedAt || a.timestamp) - new Date(b.updatedAt || b.timestamp));
  }

  // 3) pagination
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const start = (p - 1) * l;
  const end = start + l;
  const paginated = result.slice(start, end);

  res.json({
    page: p,
    limit: l,
    total: result.length,
    dreams: paginated
  });
});


// READ one dream by id
app.get('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const dream = dreams.find(d => d.id === id);
  if (!dream) return res.status(404).json({ error: 'Dream not found' });
  res.json(dream);
});

// UPDATE dream
app.put('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  const dream = dreams.find(d => d.id === id);

  if (!dream) return res.status(404).json({ error: 'Dream not found' });

  if (title) dream.title = title;
  if (content) dream.content = content;
  dream.updatedAt = new Date().toISOString();  // อัปเดตเวลาแก้ไขล่าสุด

  saveDreams();
  res.json(dream);
});

// DELETE dream
app.delete('/dreams/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = dreams.findIndex(d => d.id === id);

  if (index === -1) return res.status(404).json({ error: 'Dream not found' });

  const [removed] = dreams.splice(index, 1);
  saveDreams();
  res.json({ deleted: removed });
});

app.use(express.static('public'));

// start server (keep this last)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
