import { spawn } from '@devrev/ts-adaas';
import { EventType, ExtractorEventType } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Extraction function that handles various extraction events from Airdrop platform.
 * Currently implements external sync units extraction by fetching boards from Trello.
 * 
 * @param events Array of function input events
 * @returns A success message indicating the extraction was successful
 */
export async function extraction(events: FunctionInput[]): Promise<{ status: string, message: string }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Extraction function invoked with request ID: ${requestId}`);

    // Convert to AirdropEvent format
    const airdropEvent = convertToAirdropEvent(event);

    // Check if the event type is supported
    if (airdropEvent.payload.event_type === EventType.ExtractionExternalSyncUnitsStart) {
      console.log('Processing external sync units extraction event');
      
      try {
        // Use require.resolve to find the worker file relative to this module
        const workerPath = require.resolve('./worker');
        
        // Get the initial domain mapping
        const mappingFilePath = path.resolve(__dirname, '../../core/initial_domain_mapping.json');
        const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
        const initialDomainMapping = JSON.parse(mappingContent);
        
        // Create a worker to handle the event
        await spawn({
          event: airdropEvent,
          initialState: {},
          workerPath: workerPath,
          initialDomainMapping: initialDomainMapping,
        });
        
        return {
          status: 'success',
          message: 'External sync units extraction completed successfully'
        };
      } catch (error) {
        console.error('Error in external sync units extraction:', error);
        // Properly handle the unknown error type
        if (error instanceof Error) {
          throw new Error(`Failed to process external sync units extraction: ${error.message}`);
        } else {
          throw new Error(`Failed to process external sync units extraction: ${String(error)}`);
        }
      }
    } else if (airdropEvent.payload.event_type === EventType.ExtractionMetadataStart) {
      console.log('Processing metadata extraction event');
      
      try {
        // Use require.resolve to find the worker file relative to this module
        const workerPath = require.resolve('./worker');
        
        // Get the initial domain mapping
        const mappingFilePath = path.resolve(__dirname, '../../core/initial_domain_mapping.json');
        const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
        const initialDomainMapping = JSON.parse(mappingContent);
        
        // Create a worker to handle the event
        await spawn({
          event: airdropEvent,
          initialState: {},
          workerPath: workerPath,
          initialDomainMapping: initialDomainMapping,
        });
        
        return {
          status: 'success',
          message: 'Metadata extraction completed successfully'
        };
      } catch (error) {
        console.error('Error in metadata extraction:', error);
        // Properly handle the unknown error type
        if (error instanceof Error) {
          throw new Error(`Failed to process metadata extraction: ${error.message}`);
        } else {
          throw new Error(`Failed to process metadata extraction: ${String(error)}`);
        }
      }
    } else if (airdropEvent.payload.event_type === EventType.ExtractionDataStart || 
               airdropEvent.payload.event_type === EventType.ExtractionDataContinue) {
      console.log('Processing data extraction event');
      
      try {
        // Use require.resolve to find the worker file relative to this module
        const workerPath = require.resolve('./worker');
        
        // Get the initial domain mapping
        const mappingFilePath = path.resolve(__dirname, '../../core/initial_domain_mapping.json');
        const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
        const initialDomainMapping = JSON.parse(mappingContent);
        
        // Initial state for the worker
        const initialState = {
          users: { completed: false },
          cards: { completed: false },
          attachments: { completed: false }
        };
        
        // Create a worker to handle the event
        await spawn({
          event: airdropEvent,
          initialState: initialState,
          workerPath: workerPath,
          initialDomainMapping: initialDomainMapping,
        });
        
        return {
          status: 'success',
          message: 'Data extraction completed successfully'
        };
      } catch (error) {
        console.error('Error in data extraction:', error);
        // Properly handle the unknown error type
        if (error instanceof Error) {
          throw new Error(`Failed to process data extraction: ${error.message}`);
        } else {
          throw new Error(`Failed to process data extraction: ${String(error)}`);
        }
      }
    } else if (airdropEvent.payload.event_type === EventType.ExtractionAttachmentsStart || 
               airdropEvent.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      console.log('Processing attachments extraction event');
      
      try {
        // Use require.resolve to find the worker file relative to this module
        const workerPath = require.resolve('./worker');
        
        // Get the initial domain mapping
        const mappingFilePath = path.resolve(__dirname, '../../core/initial_domain_mapping.json');
        const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
        const initialDomainMapping = JSON.parse(mappingContent);
        
        // Initial state for the worker
        const initialState = {
          users: { completed: false },
          cards: { completed: false },
          attachments: { completed: false }
        };
        
        // Create a worker to handle the event
        await spawn({
          event: airdropEvent,
          initialState: initialState,
          workerPath: workerPath,
          initialDomainMapping: initialDomainMapping,
        });
        
        return {
          status: 'success',
          message: 'Attachments extraction completed successfully'
        };
      } catch (error) {
        console.error('Error in attachments extraction:', error);
        // Properly handle the unknown error type
        if (error instanceof Error) {
          throw new Error(`Failed to process attachments extraction: ${error.message}`);
        } else {
          throw new Error(`Failed to process attachments extraction: ${String(error)}`);
        }
      }
    } else {
      console.log(`Received unsupported event type: ${airdropEvent.payload.event_type}`);
      return {
        status: 'success',
        message: `Function executed, but the event type ${airdropEvent.payload.event_type} is not supported yet`
      };
    }
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in extraction function:', error);
    throw error;
  }
}