'use server';
// import { suggestRulesFromDescription, type SuggestRulesFromDescriptionInput } from "@/ai/flows/suggest-rules-from-description"; // Removed
// import { z } from "zod"; // Removed as it's only used by the removed action

// const SuggestionSchema = z.object({ // Removed
//   description: z.string().min(10, "Description must be at least 10 characters.").max(500, "Description must be 500 characters or less."),
// });

// interface FormState { // Removed
//   message: string | null;
//   errors: {
//     description?: string[];
//     _form?: string[];
//   } | null;
//   suggestedRules: string | null;
// }

// export async function getAIRuleSuggestions(prevState: FormState, formData: FormData): Promise<FormState> { // Removed
//   try {
//     const description = formData.get("description");
//     const validatedFields = SuggestionSchema.safeParse({
//       description: description,
//     });

//     if (!validatedFields.success) {
//       return {
//         message: "Validation failed. Please check your input.",
//         errors: validatedFields.error.flatten().fieldErrors,
//         suggestedRules: null,
//       };
//     }

//     const input: SuggestRulesFromDescriptionInput = {
//       description: validatedFields.data.description,
//     };

//     // console.log("Calling AI flow with input:", input);
//     const result = await suggestRulesFromDescription(input);
//     // console.log("AI flow result:", result);

//     if (!result || !result.suggestedRules) {
//         return {
//             message: "AI could not generate suggestions for the provided input. Try rephrasing your description.",
//             suggestedRules: null,
//             errors: { _form: ["AI failed to generate suggestions."] },
//         };
//     }

//     return {
//       message: "Suggestions generated successfully.",
//       suggestedRules: result.suggestedRules,
//       errors: null,
//     };
//   } catch (error: unknown) {
//     // console.error("Error generating AI suggestions:", error);
//     let errorMessage = "An unexpected error occurred while generating suggestions.";
//     if (error instanceof Error) {
//         errorMessage = error.message;
//     }
//     return {
//       message: "An error occurred.",
//       suggestedRules: null,
//       errors: { _form: [errorMessage] },
//     };
//   }
// }

// Add other server actions below if needed
