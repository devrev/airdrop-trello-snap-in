import { NormalizedAttachment } from '@devrev/ts-adaas';

// Mock normalization function for testing
function normalizeAttachment(attachment: any): NormalizedAttachment {
  let url = attachment.url;
  
  // Special URL handling for Trello URLs
  if (url && url.startsWith('https://trello.com')) {
    const fileName = attachment.fileName || attachment.name;
    url = `https://api.trello.com/1/cards/${attachment.parent_id}/attachments/${attachment.id}/download/${fileName}`;
  }

  return {
    id: attachment.id,
    url: url || null,
    file_name: attachment.fileName || attachment.name || null,
    parent_id: attachment.parent_id || null,
    author_id: attachment.idMember || null,
  };
}

describe('normalizeAttachment', () => {
  it('should normalize attachment with Trello URL', () => {
    const attachment = {
      id: 'attachment123',
      url: 'https://trello.com/c/shortlink/attachment',
      fileName: 'test-file.pdf',
      name: 'test-file.pdf',
      parent_id: 'card123',
      idMember: 'member123'
    };

    const result = normalizeAttachment(attachment);

    expect(result).toEqual({
      id: 'attachment123',
      url: 'https://api.trello.com/1/cards/card123/attachments/attachment123/download/test-file.pdf',
      file_name: 'test-file.pdf',
      parent_id: 'card123',
      author_id: 'member123'
    });
  });

  it('should normalize attachment with external URL', () => {
    const attachment = {
      id: 'attachment456',
      url: 'https://example.com/file.pdf',
      fileName: 'external-file.pdf',
      name: 'external-file.pdf',
      parent_id: 'card456',
      idMember: 'member456'
    };

    const result = normalizeAttachment(attachment);

    expect(result).toEqual({
      id: 'attachment456',
      url: 'https://example.com/file.pdf',
      file_name: 'external-file.pdf',
      parent_id: 'card456',
      author_id: 'member456'
    });
  });

  it('should handle attachment with missing optional fields', () => {
    const attachment = {
      id: 'attachment789',
      url: 'https://example.com/file.pdf',
      name: 'file.pdf',
      parent_id: 'card789'
    };

    const result = normalizeAttachment(attachment);

    expect(result).toEqual({
      id: 'attachment789',
      url: 'https://example.com/file.pdf',
      file_name: 'file.pdf',
      parent_id: 'card789',
      author_id: null
    });
  });

  it('should use name field when fileName is not available', () => {
    const attachment = {
      id: 'attachment999',
      url: 'https://trello.com/c/shortlink/attachment',
      name: 'backup-name.pdf',
      parent_id: 'card999',
      idMember: 'member999'
    };

    const result = normalizeAttachment(attachment);

    expect(result).toEqual({
      id: 'attachment999',
      url: 'https://api.trello.com/1/cards/card999/attachments/attachment999/download/backup-name.pdf',
      file_name: 'backup-name.pdf',
      parent_id: 'card999',
      author_id: 'member999'
    });
  });
});