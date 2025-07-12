
'use server';

/**
 * @fileOverview An AI agent for automatically mapping lead information from D7 Lead Finder to GoHighLevel contact fields.
 *
 * - smartMap - A function that handles the lead information mapping process.
 * - SmartMapInput - The input type for the smartMap function.
 * - SmartMapOutput - The return type for the smartMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartMapInputSchema = z.object({
  d7Lead: z.record(z.string(), z.any()).describe('Lead information from D7 Lead Finder.'),
  ghlFields: z.array(z.string()).describe('Available contact fields in GoHighLevel.'),
});
export type SmartMapInput = z.infer<typeof SmartMapInputSchema>;

const SmartMapOutputSchema = z.record(z.string(), z.string()).describe('Mapping of D7 Lead Finder fields to GoHighLevel contact fields.');
export type SmartMapOutput = z.infer<typeof SmartMapOutputSchema>;

export async function smartMap(input: SmartMapInput): Promise<SmartMapOutput> {
  return smartMapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartMapPrompt',
  input: {schema: SmartMapInputSchema},
  // Removed output schema here to rely on prompt for JSON structure and parse manually
  prompt: `You are an expert in mapping data fields between different systems.

  You will receive lead information from D7 Lead Finder and a list of available contact fields in GoHighLevel.
  Your task is to map the D7 Lead Finder fields to the appropriate GoHighLevel contact fields.

  D7 Lead Finder Information:
  {{#each d7Lead}}
  {{@key}}: {{{this}}}
  {{/each}}

  GoHighLevel Contact Fields:
  {{#each ghlFields}}
  - {{{this}}}
  {{/each}}

  Return a JSON object where the keys are GoHighLevel contact fields and the values are the corresponding D7 Lead Finder fields. If a field cannot be mapped, leave the value as an empty string.

  Ensure that the output is a valid JSON object. Do not wrap the JSON in markdown code fences.
  Here is an example of the expected output format:
  {
  "firstName": "firstName",
  "lastName": "lastName",
  "email": "email",
  "phone": "phone",
  "company": "companyName",
  "address": "address",
  "city": "city",
  "state": "state",
  "zipCode": "zipCode"
  }
  `,
});

const smartMapFlow = ai.defineFlow(
  {
    name: 'smartMapFlow',
    inputSchema: SmartMapInputSchema,
    outputSchema: SmartMapOutputSchema, // Flow's output contract is still defined by this schema
  },
  async (input): Promise<SmartMapOutput> => {
    const response = await prompt(input); // ai.prompt returns a GenerateResponse
    let textOutput = response.text;    // Get the raw text output

    if (!textOutput) {
      console.error('AI response was empty.');
      throw new Error('AI returned an empty response.');
    }

    // Clean potential markdown fences
    if (textOutput.startsWith('```json\n')) {
      textOutput = textOutput.substring(7); // Remove ```json\n
      if (textOutput.endsWith('\n```')) {
        textOutput = textOutput.substring(0, textOutput.length - 4); // Remove \n```
      } else if (textOutput.endsWith('```')) {
        textOutput = textOutput.substring(0, textOutput.length - 3); // Remove ```
      }
    } else if (textOutput.startsWith('```')) {
        textOutput = textOutput.substring(3);
        if (textOutput.endsWith('```')) {
            textOutput = textOutput.substring(0, textOutput.length - 3);
        }
    }
    textOutput = textOutput.trim();


    try {
      // The prompt asks for JSON, so we expect textOutput to be a JSON string.
      const parsedJson = JSON.parse(textOutput);
      // Validate the parsed JSON against our Zod schema.
      return SmartMapOutputSchema.parse(parsedJson);
    } catch (e: any) {
      console.error('Failed to parse AI output as JSON or validate against schema:', textOutput, e);
      // It's good practice to include the problematic textOutput in the error for debugging.
      throw new Error(`AI output was not valid JSON or did not conform to the expected schema. Raw output: ${textOutput}. Error: ${e.message}`);
    }
  }
);

