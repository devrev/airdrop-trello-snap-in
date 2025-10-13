import { normalizeAttachment } from './data-extraction-utils';

/**
 * Test functions specifically for attachment extraction and normalization
 */

export const runAttachmentNormalizationTests = (mockTask: any, mockTrelloClientInstance: any, mockAdapter: any, mockRepo: any) => {
  describe('attachment normalization', () => {
    it('should normalize Trello attachments with URL transformation', () => {
      const rawAttachment = {
        id: 'att-123',
        name: 'test-file.pdf',
        fileName: 'test-file.pdf',
        url: 'https://trello.com/1/cards/card-123/attachments/att-123/download/test-file.pdf',
        idMember: 'member-456',
      };
      const cardId = 'card-123';

      const normalized = normalizeAttachment(rawAttachment, cardId);

      expect(normalized).toEqual({
        id: 'att-123',
        url: 'https://api.trello.com/1/cards/card-123/attachments/att-123/download/test-file.pdf',
        file_name: 'test-file.pdf',
        parent_id: 'card-123',
        author_id: 'member-456',
        grand_parent_id: undefined,
      });
    });

    it('should preserve non-Trello URLs', () => {
      const rawAttachment = {
        id: 'att-456',
        name: 'external-file.pdf',
        fileName: 'external-file.pdf',
        url: 'https://example.com/file.pdf',
        idMember: 'member-789',
      };
      const cardId = 'card-456';

      const normalized = normalizeAttachment(rawAttachment, cardId);

      expect(normalized).toEqual({
        id: 'att-456',
        url: 'https://example.com/file.pdf',
        file_name: 'external-file.pdf',
        parent_id: 'card-456',
        author_id: 'member-789',
        grand_parent_id: undefined,
      });
    });

    it('should handle missing optional fields', () => {
      const rawAttachment = {
        id: 'att-789',
        name: 'minimal-file.txt',
        url: 'https://trello.com/attachment',
      };
      const cardId = 'card-789';

      const normalized = normalizeAttachment(rawAttachment, cardId);

      expect(normalized).toEqual({
        id: 'att-789',
        url: 'https://api.trello.com/1/cards/card-789/attachments/att-789/download/minimal-file.txt',
        file_name: 'minimal-file.txt',
        parent_id: 'card-789',
        author_id: undefined,
        grand_parent_id: undefined,
      });
    });

    it('should handle missing fileName by using name', () => {
      const rawAttachment = {
        id: 'att-101',
        name: 'fallback-name.doc',
        url: 'https://external.com/file.doc',
      };
      const cardId = 'card-101';

      const normalized = normalizeAttachment(rawAttachment, cardId);

      expect(normalized.file_name).toBe('fallback-name.doc');
    });

    it('should handle completely missing file name', () => {
      const rawAttachment = {
        id: 'att-102',
        url: 'https://external.com/file',
      };
      const cardId = 'card-102';

      const normalized = normalizeAttachment(rawAttachment, cardId);

      expect(normalized.file_name).toBe('');
    });
  });
};

/**
 * Creates test data and expectations for attachment extraction tests
 */
export const createAttachmentExtractionTestData = () => {
  const mockOrganizationMembers = [
    {
      id: '507f1f77bcf86cd799439011',
      fullName: 'John Doe',
      username: 'johndoe',
      lastActive: '2025-01-01T12:00:00.000Z',
    },
  ];

  const mockBoardCardsWithAttachments = [
    {
      id: '507f1f77bcf86cd799439021',
      name: 'Test Card 1',
      desc: 'Test card description',
      closed: false,
      dateLastActivity: '2025-01-01T12:00:00.000Z',
      url: 'https://trello.com/c/test1',
      idMembers: ['507f1f77bcf86cd799439011'],
      attachments: [
        {
          id: 'att-1',
          name: 'document.pdf',
          fileName: 'document.pdf',
          url: 'https://trello.com/1/cards/507f1f77bcf86cd799439021/attachments/att-1/download/document.pdf',
          idMember: '507f1f77bcf86cd799439011',
        },
        {
          id: 'att-2',
          name: 'image.png',
          fileName: 'image.png',
          url: 'https://external.com/image.png',
          idMember: '507f1f77bcf86cd799439011',
        },
      ],
    },
  ];

  const mockBoardCardsWithoutAttachments = [
    {
      id: '507f1f77bcf86cd799439021',
      name: 'Test Card 1',
      desc: 'Test card description',
      closed: false,
      dateLastActivity: '2025-01-01T12:00:00.000Z',
      url: 'https://trello.com/c/test1',
      idMembers: ['507f1f77bcf86cd799439011'],
      attachments: [],
    },
  ];

  const expectedAttachments = [
    { ...mockBoardCardsWithAttachments[0].attachments[0], cardId: mockBoardCardsWithAttachments[0].id },
    { ...mockBoardCardsWithAttachments[0].attachments[1], cardId: mockBoardCardsWithAttachments[0].id },
  ];

  return {
    mockOrganizationMembers,
    mockBoardCardsWithAttachments,
    mockBoardCardsWithoutAttachments,
    expectedAttachments,
  };
};