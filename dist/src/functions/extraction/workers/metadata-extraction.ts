import { processTask, ExtractorEventType } from '@devrev/ts-adaas';
import externalDomainMetadata from '../external-domain-metadata.json';

const repos = [{ itemType: 'external_domain_metadata' }];
  
processTask({
  task: async ({ adapter }) => {
    try {
      adapter.initializeRepos(repos);
      await adapter.getRepo('external_domain_metadata')?.push([externalDomainMetadata]);
      await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in metadata extraction:', errorMessage);
      throw error;
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: { message: 'Failed to extract metadata. Lambda timeout.' },
    });
  },
});