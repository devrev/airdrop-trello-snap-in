/**
 * Normalization utilities for converting Trello data to DevRev format
 */

import {
  mapListNameToStage,
  convertTrelloIdToDate,
  convertColorToHex,
  convertToRichText,
  constructAttachmentUrl,
} from './conversion-utils';

import {
  NormalizedUser,
  NormalizedLabel,
  NormalizedCard,
  NormalizedComment,
  NormalizedAttachment,
} from './data-extraction-utils';

/**
 * Normalize a Trello user to the expected format
 */
export function normalizeUser(user: any): NormalizedUser {
  const createdDate = convertTrelloIdToDate(user.id);
  
  return {
    id: user.id,
    created_date: createdDate,
    modified_date: createdDate,
    data: {
      id: user.id,
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
    },
  };
}

/**
 * Normalize a Trello label to the expected format
 */
export function normalizeLabel(label: any): NormalizedLabel {
  const createdDate = convertTrelloIdToDate(label.id);
  const labelName = label.name || `label-${label.color}`;
  
  return {
    id: label.id,
    created_date: createdDate,
    modified_date: createdDate,
    data: {
      id: label.id,
      name: labelName,
      color: convertColorToHex(label.color),
      description: convertToRichText(labelName),
    },
  };
}

/**
 * Normalize a Trello card to the expected format
 * The card object should include listIdToNameMapping and createdById fields
 */
export function normalizeCard(cardWithContext: any): NormalizedCard {
  const card = cardWithContext;
  const createdDate = convertTrelloIdToDate(card.id);
  
  // Map stage using list name from the embedded mapping
  const listIdToNameMapping = card.listIdToNameMapping || {};
  const listName = listIdToNameMapping[card.idList] || '';
  const stage = mapListNameToStage(listName);
  
  // Convert body to rich text
  const body = card.desc ? convertToRichText(card.desc) : null;
  
  // Convert cover and badges to JSON strings
  const coverImage = card.cover ? JSON.stringify(card.cover) : null;
  const badges = card.badges ? JSON.stringify(card.badges) : null;
  
  return {
    id: card.id,
    created_date: createdDate,
    modified_date: card.dateLastActivity || createdDate,
    data: {
      id: card.id,
      title: card.name || '',
      body: body,
      target_close_date: card.due || null,
      stage: stage,
      item_url_field: card.url || '',
      owned_by_ids: card.idMembers || [],
      tags: card.idLabels || [],
      created_by_id: card.createdById || null,
      trello_due_complete: card.dueComplete || false,
      trello_position: card.pos || 0,
      state: card.closed || false,
      modified_date: card.dateLastActivity || createdDate,
      trello_subscribed: card.subscribed || false,
      trello_cover_image: coverImage,
      trello_badges: badges,
      trello_start_date: card.start || null,
    },
  };
}

/**
 * Normalize a Trello comment to the expected format
 */
export function normalizeComment(comment: any): NormalizedComment {
  const createdDate = convertTrelloIdToDate(comment.id);
  const modifiedDate = comment.data?.dateLastEdited || comment.date || createdDate;
  
  return {
    id: comment.id,
    created_date: createdDate,
    modified_date: modifiedDate,
    data: {
      id: comment.id,
      body: convertToRichText(comment.data?.text || ''),
      parent_object_id: comment.data?.idCard || '',
      created_by_id: comment.idMemberCreator || '',
      modified_date: modifiedDate,
      grandparent_object_id: comment.data?.board?.id || '',
      grandparent_object_type: 'board',
      creator_display_name: comment.memberCreator?.username || '',
      parent_object_type: 'issue',
    },
  };
}

/**
 * Normalize a Trello attachment to the expected format
 */
export function normalizeAttachment(attachmentWithContext: any): NormalizedAttachment {
  const attachment = attachmentWithContext;
  
  // Construct URL according to URLConstructionRule
  const url = constructAttachmentUrl(attachment, attachment.cardId);
  
  // Get file name (prefer fileName over name)
  const fileName = attachment.fileName || attachment.name || '';
  
  return {
    id: attachment.id,
    url: url,
    file_name: fileName,
    parent_id: attachment.cardId || '',
    author_id: attachment.idMember || undefined,
  };
}