import { apiRequest } from "./queryClient";

export async function fetchSampleCode(language: string): Promise<string> {
  try {
    const response = await apiRequest("GET", `/api/samples/${language}`);
    const data = await response.json();
    return data.sample;
  } catch (error) {
    console.error("Error fetching sample code:", error);
    return "";
  }
}
