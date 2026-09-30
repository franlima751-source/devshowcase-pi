const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- ROTAS DE PERFIL ---
// POST /api/profiles - Cadastrar perfil
app.post('/api/profiles', async (req, res) => {
  const { name, email, bio } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  }
  try {
    const profile = await prisma.profile.create({ data: { name, email, bio } });
    return res.status(201).json(profile);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar perfil ou email já existente.' });
  }
});

// GET /api/profiles/:id - Buscar perfil por id
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  const profile = await prisma.profile.findUnique({
    where: { id: Number(id) },
    include: { projects: true }
  });
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
  return res.json(profile);
});

// --- ROTAS DE TECNOLOGIAS ---
// POST /api/technologies - Cadastrar tecnologia
app.post('/api/technologies', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

  const tech = await prisma.technology.create({ data: { name } });
  return res.status(201).json(tech);
});

// GET /api/technologies - Listar todas as tecnologias
app.get('/api/technologies', async (req, res) => {
  const techs = await prisma.technology.findMany();
  return res.json(techs);
});

// --- ROTAS DE PROJETOS ---
// POST /api/projects - Cadastrar projeto
app.post('/api/projects', async (req, res) => {
  const { title, description, url, profileId, technologyIds } = req.body;
  if (!title || !url || !profileId) {
    return res.status(400).json({ error: 'Título, URL e profileId são obrigatórios.' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        title,
        description,
        url,
        profileId: Number(profileId),
        technologies: technologyIds ? { connect: technologyIds.map(id => ({ id })) } : undefined
      },
      include: { technologies: true }
    });
    return res.status(201).json(project);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar projeto.' });
  }
});

// GET /api/projects - Listar todos os projetos
app.get('/api/projects', async (req, res) => {
  const projects = await prisma.project.findMany({
    include: { profile: true, technologies: true, feedbacks: true }
  });
  return res.json(projects);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Servidor rodando na porta ${PORT});
});
