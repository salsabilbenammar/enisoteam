const express = require('express');
const logistiqueController = require('../controllers/logistiqueController');
const { requireAdmin, requireModuleWrite } = require('../middlewares/authMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('logistique');

router.get('/', requireAdmin, logistiqueController.getAll);
router.post('/', canWrite, logistiqueController.create);

router.get('/emprunts', requireAdmin, logistiqueController.listEmprunts);
router.post('/emprunts', canWrite, logistiqueController.createEmprunt);
router.post('/emprunts/:id/retour', canWrite, logistiqueController.returnEmprunt);

router.get('/:id', requireAdmin, logistiqueController.getById);
router.put('/:id', canWrite, logistiqueController.update);
router.delete('/:id', canWrite, logistiqueController.remove);

module.exports = router;
