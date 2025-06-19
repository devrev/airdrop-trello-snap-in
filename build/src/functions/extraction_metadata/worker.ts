import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import { generateMetadataSchema } from '../generate_domain_metadata/metadata-schema';

/**
 * State interface for the metadata extraction process
 */
interface MetadataExtractionState {
  completed: boolean;
  error?: string;
}

/**
 * Worker file for handling metadata extraction
 */
processTask<MetadataExtractionState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting metadata extraction');
      
      // Generate the External Domain Metadata
      const metadata = generateMetadataSchema();
      
      // Initialize repository for external_domain_metadata
      const repos = [
        {
          itemType: 'external_domain_metadata',
          normalize: (item: any) => ({
            id: 'external_domain_metadata',
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString(),
            data: item
          })
        }
      ];
      
      adapter.initializeRepos(repos);
      
      // Push metadata to the repository
      await adapter.getRepo('external_domain_metadata')?.push([metadata]);
      
      // Update state to indicate completion
      adapter.state.completed = true;
      
      // Emit the metadata extraction done event
      await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
      
      console.log('Metadata extraction completed successfully');
    } catch (error) {
      console.error('Error in metadata extraction:', error);
      
      // Update state to indicate error
      adapter.state.completed = false;
      adapter.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during metadata extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Metadata extraction timed out');
    
    // Update state to indicate timeout
    adapter.state.completed = false;
    adapter.state.error = 'Metadata extraction timed out';
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: 'Metadata extraction timed out',
      },
    });
  },
});