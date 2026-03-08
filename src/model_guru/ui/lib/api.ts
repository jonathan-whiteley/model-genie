import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body: unknown){
        super(`HTTP ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export interface Body_uploadQuestions {
    file: string;
}
export interface CatalogListResponse {
    catalogs: string[];
}
export interface ColumnMapping {
    aggregation?: string | null;
    column: string;
    confidence: number;
    entity_name: string;
    entity_type: "measure" | "dimension" | "filter";
    table: string;
}
export interface ColumnMatch {
    catalog_column: string;
    confidence: number;
    entity_name: string;
}
export interface ComplexValue {
    display?: string | null;
    primary?: boolean | null;
    ref?: string | null;
    type?: string | null;
    value?: string | null;
}
export interface ConfirmedMapping {
    aggregation?: string | null;
    column: string;
    entity_name: string;
    entity_type: "measure" | "dimension" | "filter";
    table: string;
}
export interface DeployMetricViewRequest {
    catalog: string;
    schema_name: string;
    view_name: string;
    yaml_content: string;
}
export interface DeployMetricViewResponse {
    message: string;
    success: boolean;
    view_url?: string | null;
}
export interface DiscoverTablesRequest {
    catalog: string;
    entities: ExtractedEntity[];
}
export interface DiscoverTablesResponse {
    tables: TableSuggestion[];
}
export interface ERDEdge {
    source: string;
    source_column: string;
    target: string;
    target_column: string;
}
export interface ERDNode {
    columns: string[];
    id: string;
    table_name: string;
}
export interface ERDSpec {
    edges: ERDEdge[];
    nodes: ERDNode[];
}
export interface ExtractedEntity {
    inferred_column: string;
    name: string;
    source_questions: number[];
    type: "measure" | "dimension" | "filter";
}
export interface GenerateMetricViewRequest {
    confirmed_mappings: ConfirmedMapping[];
    source_table: string;
    view_name: string;
}
export interface GenerateMetricViewResponse {
    erd: ERDSpec;
    yaml_content: string;
}
export interface HTTPValidationError {
    detail?: ValidationError[];
}
export interface Highlight {
    end: number;
    start: number;
    text: string;
    type: "measure" | "dimension" | "filter";
}
export interface MapColumnsRequest {
    entities: ExtractedEntity[];
    selected_tables: string[];
}
export interface MapColumnsResponse {
    mappings: ColumnMapping[];
}
export interface Name {
    family_name?: string | null;
    given_name?: string | null;
}
export interface ParseQuestionsRequest {
    questions: string[];
}
export interface ParseQuestionsResponse {
    entities: ExtractedEntity[];
    parsed_questions: ParsedQuestion[];
}
export interface ParsedQuestion {
    highlights: Highlight[];
    original_text: string;
}
export interface TableSuggestion {
    confidence: number;
    description: string;
    matched_columns: ColumnMatch[];
    table_name: string;
}
export interface User {
    active?: boolean | null;
    display_name?: string | null;
    emails?: ComplexValue[] | null;
    entitlements?: ComplexValue[] | null;
    external_id?: string | null;
    groups?: ComplexValue[] | null;
    id?: string | null;
    name?: Name | null;
    roles?: ComplexValue[] | null;
    schemas?: UserSchema[] | null;
    user_name?: string | null;
}
export const UserSchema = {
    "urn:ietf:params:scim:schemas:core:2.0:User": "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:workspace:2.0:User": "urn:ietf:params:scim:schemas:extension:workspace:2.0:User"
} as const;
export type UserSchema = typeof UserSchema[keyof typeof UserSchema];
export interface ValidationError {
    ctx?: Record<string, unknown>;
    input?: unknown;
    loc: (string | number)[];
    msg: string;
    type: string;
}
export interface VersionOut {
    version: string;
}
export interface ListCatalogsParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const listCatalogs = async (params?: ListCatalogsParams, options?: RequestInit): Promise<{
    data: CatalogListResponse;
}> =>{
    const res = await fetch("/api/catalogs", {
        ...options,
        method: "GET",
        headers: {
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        }
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listCatalogsKey = (params?: ListCatalogsParams)=>{
    return [
        "/api/catalogs",
        params
    ] as const;
};
export function useListCatalogs<TData = {
    data: CatalogListResponse;
}>(options?: {
    params?: ListCatalogsParams;
    query?: Omit<UseQueryOptions<{
        data: CatalogListResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listCatalogsKey(options?.params),
        queryFn: ()=>listCatalogs(options?.params),
        ...options?.query
    });
}
export function useListCatalogsSuspense<TData = {
    data: CatalogListResponse;
}>(options?: {
    params?: ListCatalogsParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: CatalogListResponse;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listCatalogsKey(options?.params),
        queryFn: ()=>listCatalogs(options?.params),
        ...options?.query
    });
}
export interface CurrentUserParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const currentUser = async (params?: CurrentUserParams, options?: RequestInit): Promise<{
    data: User;
}> =>{
    const res = await fetch("/api/current-user", {
        ...options,
        method: "GET",
        headers: {
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        }
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const currentUserKey = (params?: CurrentUserParams)=>{
    return [
        "/api/current-user",
        params
    ] as const;
};
export function useCurrentUser<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export function useCurrentUserSuspense<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export interface DeployMetricViewParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const deployMetricView = async (data: DeployMetricViewRequest, params?: DeployMetricViewParams, options?: RequestInit): Promise<{
    data: DeployMetricViewResponse;
}> =>{
    const res = await fetch("/api/deploy-metric-view", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useDeployMetricView(options?: {
    mutation?: UseMutationOptions<{
        data: DeployMetricViewResponse;
    }, ApiError, {
        params: DeployMetricViewParams;
        data: DeployMetricViewRequest;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>deployMetricView(vars.data, vars.params),
        ...options?.mutation
    });
}
export interface DiscoverTablesParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const discoverTables = async (data: DiscoverTablesRequest, params?: DiscoverTablesParams, options?: RequestInit): Promise<{
    data: DiscoverTablesResponse;
}> =>{
    const res = await fetch("/api/discover-tables", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useDiscoverTables(options?: {
    mutation?: UseMutationOptions<{
        data: DiscoverTablesResponse;
    }, ApiError, {
        params: DiscoverTablesParams;
        data: DiscoverTablesRequest;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>discoverTables(vars.data, vars.params),
        ...options?.mutation
    });
}
export const generateMetricView = async (data: GenerateMetricViewRequest, options?: RequestInit): Promise<{
    data: GenerateMetricViewResponse;
}> =>{
    const res = await fetch("/api/generate-metric-view", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useGenerateMetricView(options?: {
    mutation?: UseMutationOptions<{
        data: GenerateMetricViewResponse;
    }, ApiError, GenerateMetricViewRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>generateMetricView(data),
        ...options?.mutation
    });
}
export interface MapColumnsParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const mapColumns = async (data: MapColumnsRequest, params?: MapColumnsParams, options?: RequestInit): Promise<{
    data: MapColumnsResponse;
}> =>{
    const res = await fetch("/api/map-columns", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useMapColumns(options?: {
    mutation?: UseMutationOptions<{
        data: MapColumnsResponse;
    }, ApiError, {
        params: MapColumnsParams;
        data: MapColumnsRequest;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>mapColumns(vars.data, vars.params),
        ...options?.mutation
    });
}
export const parseQuestions = async (data: ParseQuestionsRequest, options?: RequestInit): Promise<{
    data: ParseQuestionsResponse;
}> =>{
    const res = await fetch("/api/parse-questions", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useParseQuestions(options?: {
    mutation?: UseMutationOptions<{
        data: ParseQuestionsResponse;
    }, ApiError, ParseQuestionsRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>parseQuestions(data),
        ...options?.mutation
    });
}
export const uploadQuestions = async (data: FormData, options?: RequestInit): Promise<{
    data: ParseQuestionsResponse;
}> =>{
    const res = await fetch("/api/upload-questions", {
        ...options,
        method: "POST",
        headers: {
            ...options?.headers
        },
        body: data
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useUploadQuestions(options?: {
    mutation?: UseMutationOptions<{
        data: ParseQuestionsResponse;
    }, ApiError, FormData>;
}) {
    return useMutation({
        mutationFn: (data)=>uploadQuestions(data),
        ...options?.mutation
    });
}
export const version = async (options?: RequestInit): Promise<{
    data: VersionOut;
}> =>{
    const res = await fetch("/api/version", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const versionKey = ()=>{
    return [
        "/api/version"
    ] as const;
};
export function useVersion<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export function useVersionSuspense<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
