import { generateMetadataSchema } from './metadata-schema';

/**
 * Function that generates and returns the External Domain Metadata JSON object.
 * 
 * @returns Object containing the External Domain Metadata
 */
export const handler = async (): Promise<{ success: boolean; message: string; metadata?: any }> => {
  try {
    // Generate the External Domain Metadata
    const metadata = generateMetadataSchema();

    return {
      success: true,
      message: 'Successfully generated External Domain Metadata',
      metadata
    };
  } catch (error) {
    console.error('Error in generate_domain_metadata function:', error);
    return {
      success: false,
      message: `Failed to generate External Domain Metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};