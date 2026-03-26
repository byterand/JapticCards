import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Deck from '../models/Deck.js';

const router = Router();

const deckRules = [
    body('title').trim().notEmpty().isLength({ min: 3, max: 20 }),
    body('description').optional().trim().notEmpty().isLength({ min: 5, max: 100 }),
    body('tags').optional().trim().notEmpty().isLength({ min: 2, max: 20 })
];

// deck routes
router.get('/decks', async (req, res) => {
    const decks = await Deck.find({});
    if (!decks) return res.status(500).json({error: 'Decks not found'});
    return res.status(200).json({decks: decks});
});

router.post('/decks', deckRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {title, description, tags} = req.body;
    try {
        const deck = await Deck.create({title, description, tags});
        return res.status(201).json({ message: 'Deck created', newDeck: deck/*, deckId: deck._id*/ });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/decks/:deckId', async (req, res) => {
    const deck = await Deck.findById(req.params.deckId);
    if (!deck) return res.status(500).json({error: 'Deck not found'});
    return res.status(200).json({deck: deck});
});

router.put('/decks/:deckId', deckRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


});

router.delete('/decks/:deckId', async (req, res) => {
    const deck = await Deck.findById(req.params.deckId);
    if (!deck) return res.status(500).json({error: 'Deck not found'});

    const deleteInfo = await Deck.deleteOne({_id: req.params.deckId});
    if (!deleteInfo) return res.status(500).json({error: 'Deck could not be deleted'});
    return res.status(200).json({deletedDeck: deck});
});

const cardRules = [
    body('front').trim().notEmpty().isLength({ min: 1, max: 200 }),
    body('back').trim().notEmpty().isLength({ min: 1, max: 200 }),
    body('image').optional()
];

// card routes
router.get('/decks/:deckId/cards', async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.deckId);
        if (!deck) return res.status(500).json({error: 'Deck not found'});
        return res.status(200).json({cards: deck.cards});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/decks/:deckId/cards', cardRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {front, back, image} = req.body;
    try {
        const deck = await Deck.findById(req.params.deckId);
        const index = deck.cards.push({front, back, image});
        const card = deck.cards[index-1];

        await deck.save();
        return res.status(201).json({ message: 'Card created', newCard: card/*, cardId: card._id */});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/decks/:deckId/cards/:cardId', async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.deckId);
        if (!deck) return res.status(500).json({error: 'Deck not found'});

        const card = deck.cards.id(req.params.cardId);
        if (!card) return res.status(500).json({error: 'Card not found'});
        
        return res.status(200).json({card: card});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.put('/decks/:deckId/cards/:cardId', cardRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


});

router.delete('/decks/:deckId/cards/:cardId', async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.deckId);
        if (!deck) return res.status(500).json({error: 'Deck not found'});

        const card = deck.cards.id(req.params.cardId);
        if (!card) return res.status(500).json({error: 'Card not found'});

        card.deleteOne();
        await deck.save();

        return res.status(200).json({card: card});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;