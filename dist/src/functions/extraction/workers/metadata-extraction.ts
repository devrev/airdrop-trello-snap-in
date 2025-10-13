import { processTask, ExtractorEventType } from '@devrev/ts-adaas';
import externalDomainMetadata from '../../../core/external-domain-metadata.json';

/**
 * Worker for metadata extraction.
 * Pushes external domain metadata to repository and emits EXTRACTION_METADATA_DONE.
 */
processTask({
  task: async ({ adapter }) => {
    try {
      // Initialize repository for external domain metadata
      const repos = [{ itemType: "external_domain_metadata" }];
      adapter.initializeRepos(repos);
      
      // Push external domain metadata without normalization
      await adapter
        .getRepo("external_domain_metadata")
        ?.push([externalDomainMetadata]);
      
      // Emit success event
      try {
        await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
      } catch (emitError) {
        // If emitting success fails, try to emit error instead
        console.error('Failed to emit success event:', emitError);
        await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
          error: { message: 'Failed to emit success event after successful metadata extraction' },
        });
      }
    } catch (error) {
      console.error('Metadata extraction error:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      try {
        await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
          error: { message: error instanceof Error ? error.message : 'Failed to extract metadata' },
        });
      } catch (emitError) {
        console.error('Failed to emit error event:', emitError);
        // Cannot do much more here, just log the failure
      }
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: { message: "Failed to extract metadata. Lambda timeout." },
      });
    } catch (error) {
      console.error('Failed to emit timeout error event:', error);
      // Cannot do much more in timeout handler, just log the failure
    }
  },
});