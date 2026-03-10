'use strict';

/**
 * Tests for the User model (in-memory store).
 */

// Each test file gets a fresh module instance via jest.resetModules,
// so we can test the in-memory store in isolation.
describe('UserModel', () => {
  let UserModel;

  beforeEach(() => {
    jest.resetModules();
    UserModel = require('../../src/models/User');
  });

  describe('createFromGoogle', () => {
    it('creates a new user with the supplied Google profile fields', () => {
      const profile = {
        googleId: 'gid-001',
        email: 'alice@example.com',
        name: 'Alice Smith',
        avatar: 'https://lh3.googleusercontent.com/alice.jpg',
      };

      const user = UserModel.createFromGoogle(profile);

      expect(user.id).toBeDefined();
      expect(user.googleId).toBe('gid-001');
      expect(user.email).toBe('alice@example.com');
      expect(user.name).toBe('Alice Smith');
      expect(user.avatar).toBe('https://lh3.googleusercontent.com/alice.jpg');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('stores null avatar when none is provided', () => {
      const user = UserModel.createFromGoogle({
        googleId: 'gid-002',
        email: 'bob@example.com',
        name: 'Bob',
        avatar: null,
      });

      expect(user.avatar).toBeNull();
    });

    it('assigns unique IDs to different users', () => {
      const u1 = UserModel.createFromGoogle({ googleId: 'g1', email: 'a@x.com', name: 'A', avatar: null });
      const u2 = UserModel.createFromGoogle({ googleId: 'g2', email: 'b@x.com', name: 'B', avatar: null });
      expect(u1.id).not.toBe(u2.id);
    });
  });

  describe('findByGoogleId', () => {
    it('returns the matching user', () => {
      const created = UserModel.createFromGoogle({
        googleId: 'gid-100',
        email: 'c@example.com',
        name: 'Carol',
        avatar: null,
      });

      expect(UserModel.findByGoogleId('gid-100')).toEqual(created);
    });

    it('returns undefined for an unknown googleId', () => {
      expect(UserModel.findByGoogleId('unknown')).toBeUndefined();
    });
  });

  describe('findByEmail', () => {
    it('returns the matching user', () => {
      const created = UserModel.createFromGoogle({
        googleId: 'gid-200',
        email: 'dave@example.com',
        name: 'Dave',
        avatar: null,
      });

      expect(UserModel.findByEmail('dave@example.com')).toEqual(created);
    });

    it('returns undefined for an unknown email', () => {
      expect(UserModel.findByEmail('nobody@example.com')).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns the matching user', () => {
      const created = UserModel.createFromGoogle({
        googleId: 'gid-300',
        email: 'eve@example.com',
        name: 'Eve',
        avatar: null,
      });

      expect(UserModel.findById(created.id)).toEqual(created);
    });

    it('returns undefined for an unknown id', () => {
      expect(UserModel.findById('00000000-0000-0000-0000-000000000000')).toBeUndefined();
    });
  });

  describe('linkGoogleAccount', () => {
    it('links a Google identity to an existing account', () => {
      const existing = UserModel.createFromGoogle({
        googleId: 'old-gid',
        email: 'frank@example.com',
        name: 'Frank',
        avatar: null,
      });

      const updated = UserModel.linkGoogleAccount(existing.id, {
        googleId: 'new-gid',
        avatar: 'https://lh3.googleusercontent.com/frank.jpg',
      });

      expect(updated.googleId).toBe('new-gid');
      expect(updated.avatar).toBe('https://lh3.googleusercontent.com/frank.jpg');
    });

    it('returns undefined for a non-existent user id', () => {
      const result = UserModel.linkGoogleAccount('no-such-id', {
        googleId: 'gid-x',
        avatar: null,
      });
      expect(result).toBeUndefined();
    });
  });

  describe('toPublic', () => {
    it('returns only public fields', () => {
      const user = UserModel.createFromGoogle({
        googleId: 'gid-pub',
        email: 'grace@example.com',
        name: 'Grace',
        avatar: 'https://example.com/grace.jpg',
      });

      const pub = UserModel.toPublic(user);

      expect(pub).toEqual({
        id: user.id,
        email: 'grace@example.com',
        name: 'Grace',
        avatar: 'https://example.com/grace.jpg',
        createdAt: user.createdAt,
      });
      expect(pub.googleId).toBeUndefined();
    });
  });
});
