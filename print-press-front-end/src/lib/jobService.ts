// lib/jobService.ts
import { api } from './api';
import {
  Job,
  JobWithDetails,
  JobFormData,
  PaginatedJobsResponse,
  MaterialUsed,
  WasteExpense,
} from '@/types/jobs';

// Define proper error types
interface ApiErrorResponse {
  status?: number;
  data?: {
    error?: string;
    [key: string]: unknown;
  };
}

interface ApiError extends Error {
  response?: ApiErrorResponse;
  request?: unknown;
}

interface UpdateJobMaterialsResponse {
  materials: MaterialUsed[];
  waste?: WasteExpense[];
  expenses?: Expense[];
  editHistory: EditHistory[];
  message: string;
}

// Define additional types you may need
interface Expense {
  id?: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface EditHistory {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  changes: Record<string, unknown>;
  reason: string;
  created_at: string;
}

export const jobService = {
  async getAllJobs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedJobsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const response = await api.get(`/jobs?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching all jobs:', error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async getJobById(id: string): Promise<JobWithDetails> {
    try {
      const response = await api.get(`/jobs/${id}`);

      // Log the response structure for debugging
      console.log('Job API Response:', response.data);

      if (!response.data || !response.data.job) {
        throw new Error('Invalid response structure from server');
      }

      const jobData = response.data.job;

      // Map waste from backend response (backend uses 'waste', frontend expects 'waste_expenses')
      const wasteExpenses: WasteExpense[] =
        jobData.waste_expenses ||
        response.data.waste_expenses ||
        response.data.waste ||
        [];

      return {
        ...jobData,
        materials: jobData.materials || response.data.materials || [],
        waste_expenses: wasteExpenses,
        waste: wasteExpenses, // Also provide 'waste' alias for component compatibility
        payments: jobData.payments || response.data.payments || [],
        edit_history: jobData.edit_history || response.data.edit_history || [],
        customer: jobData.customer || response.data.customer || null,
        worker: jobData.worker || response.data.worker || null,

        // Ensure calculated fields exist
        total_paid: jobData.total_paid || response.data.total_paid || 0,
        balance:
          jobData.balance !== undefined
            ? jobData.balance
            : parseFloat(jobData.total_cost) -
              parseFloat(jobData.total_paid || 0),

        // Ensure cost breakdown fields exist
        materials_cost:
          jobData.materials_cost || response.data.materials_cost || 0,
        waste_cost: jobData.waste_cost || response.data.waste_cost || 0,
        operational_cost:
          jobData.operational_cost || response.data.operational_cost || 0,
        labor_cost: jobData.labor_cost || response.data.labor_cost || 0,
        profit: jobData.profit || response.data.profit || 0,
      };
    } catch (error: unknown) {
      console.error(`Error fetching job ${id}:`, error);

      const apiError = error as ApiError;
      
      // Enhanced error logging
      if (apiError.response) {
        console.error('Server response:', {
          status: apiError.response.status,
          data: apiError.response.data,
          headers: apiError.response.headers,
        });
      } else if (apiError.request) {
        console.error('No response received:', apiError.request);
      } else {
        console.error('Request setup error:', apiError.message);
      }

      throw this.handleApiError(apiError);
    }
  },

  async createJob(
    jobData: JobFormData
  ): Promise<{ job: Job; message: string }> {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data;
    } catch (error: unknown) {
      console.error('Error creating job:', error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    materials?: MaterialUsed[],
    waste?: WasteExpense[]
  ): Promise<void> {
    try {
      await api.patch(`/jobs/${jobId}/status`, {
        status,
        materials: materials || [],
        waste: waste || [],
      });
    } catch (error: unknown) {
      console.error(`Error updating job ${jobId} status:`, error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async updateJob(jobId: string, jobData: Partial<Job>): Promise<Job> {
    try {
      const response = await api.put(`/jobs/${jobId}`, jobData);
      return response.data.job;
    } catch (error: unknown) {
      console.error(`Error updating job ${jobId}:`, error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    try {
      await api.delete(`/jobs/${jobId}`);
    } catch (error: unknown) {
      console.error(`Error deleting job ${jobId}:`, error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async getJobByTicketId(ticketId: string): Promise<Job> {
    try {
      const response = await api.get(`/jobs/ticket/${ticketId}`);
      return response.data.job;
    } catch (error: unknown) {
      console.error(`Error fetching job by ticket ${ticketId}:`, error);
      throw this.handleApiError(error as ApiError);
    }
  },

  async updateJobMaterials(
    jobId: string,
    materials: MaterialUsed[],
    editReason: string,
    waste?: WasteExpense[],
    expenses?: Expense[]
  ): Promise<UpdateJobMaterialsResponse> {
    try {
      const response = await api.put(`/jobs/${jobId}/materials`, {
        materials,
        waste: waste || [],
        expenses: expenses || [],
        edit_reason: editReason,
      });
      return response.data;
    } catch (error: unknown) {
      console.error(`Error updating materials for job ${jobId}:`, error);
      throw this.handleApiError(error as ApiError);
    }
  },

  // Helper method for consistent error handling
  handleApiError(error: ApiError): Error {
    if (error.response?.data && typeof error.response.data.error === 'string') {
      return new Error(error.response.data.error);
    }
    if (error.response) {
      const { status } = error.response;
      let message = `Request failed with status code ${status}`;
      if (status === 404) message = 'Resource not found.';
      if (status === 500) message = 'Internal server error.';
      return new Error(message);
    }
    if (error.request) {
      return new Error('No response received from the server.');
    }
    return error;
  },

  // Optional: Add a method to check if server is reachable
  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch {
      return false;
    }
  },
};

// Helper type for ApiError with extra properties
interface ApiErrorWithExtra extends Error {
  status?: number;
  data?: Record<string, unknown>;
}