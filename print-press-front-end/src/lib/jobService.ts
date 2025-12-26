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
    } catch (error: any) {
      console.error('Error fetching all jobs:', error);
      throw this.handleApiError(error);
    }
  },

  async getJobById(id: string, ticketId?: string): Promise<JobWithDetails> {
    try {
      const url = ticketId ? `/jobs/${id}?ticket_id=${ticketId}` : `/jobs/${id}`;
      const response = await api.get(url);

      // Log the response structure for debugging
      console.log('Job API Response:', response.data);

      if (!response.data || !response.data.job) {
        throw new Error('Invalid response structure from server');
      }

      const jobData = response.data.job;

      // Map waste from backend response (backend uses 'waste', frontend expects 'waste_expenses')
      const wasteExpenses =
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
    } catch (error: any) {
      console.error(`Error fetching job ${id}:`, error);

      // Enhanced error logging
      if (error.response) {
        console.error('Server response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }

      throw this.handleApiError(error);
    }
  },

  async createJob(
    jobData: JobFormData
  ): Promise<{ job: Job; message: string }> {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating job:', error);
      throw this.handleApiError(error);
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
    } catch (error: any) {
      console.error(`Error updating job ${jobId} status:`, error);
      throw this.handleApiError(error);
    }
  },

  async updateJob(jobId: string, jobData: Partial<Job>): Promise<Job> {
    try {
      const response = await api.put(`/jobs/${jobId}`, jobData);
      return response.data.job;
    } catch (error: any) {
      console.error(`Error updating job ${jobId}:`, error);
      throw this.handleApiError(error);
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    try {
      await api.delete(`/jobs/${jobId}`);
    } catch (error: any) {
      console.error(`Error deleting job ${jobId}:`, error);
      throw this.handleApiError(error);
    }
  },

  async getJobByTicketId(ticketId: string): Promise<Job> {
    try {
      const response = await api.get(`/jobs/ticket/${ticketId}`);
      return response.data.job;
    } catch (error: any) {
      console.error(`Error fetching job by ticket ${ticketId}:`, error);
      throw this.handleApiError(error);
    }
  },

  async updateJobMaterials(
    jobId: string,
    materials: MaterialUsed[],
    editReason: string,
    waste?: any[],
    expenses?: any[]
  ): Promise<{
    materials: MaterialUsed[];
    waste?: any[];
    expenses?: any[];
    editHistory: any[];
    message: string;
  }> {
    try {
      const response = await api.put(`/jobs/${jobId}/materials`, {
        materials,
        waste: waste || [],
        expenses: expenses || [],
        edit_reason: editReason,
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error updating materials for job ${jobId}:`, error);
      throw this.handleApiError(error);
    }
  },

  // Helper method for consistent error handling
  handleApiError(error: any): Error {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      let message = 'An error occurred';

      if (data?.error) {
        message = data.error;
      } else if (status === 404) {
        message = 'Resource not found';
      } else if (status === 500) {
        message = 'Internal server error. Please try again later.';
      } else if (status === 401) {
        message = 'Unauthorized. Please log in again.';
      } else if (status === 403) {
        message = 'You do not have permission to perform this action.';
      }

      const apiError = new Error(message);
      apiError.name = `HTTP_${status}`;
      (apiError as any).status = status;
      (apiError as any).data = data;
      return apiError;
    } else if (error.request) {
      // The request was made but no response was received
      const networkError = new Error(
        'No response from server. Please check your network connection.'
      );
      networkError.name = 'NetworkError';
      return networkError;
    } else {
      // Something happened in setting up the request that triggered an Error
      return error;
    }
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
