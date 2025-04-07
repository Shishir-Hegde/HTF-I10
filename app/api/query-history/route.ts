import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Get query history for a user with pagination and filters
export const GET = async (req: NextRequest) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const userId = searchParams.get("userId");
        const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;
        const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
        const skip = (page - 1) * limit;
        const successful = searchParams.get("successful") ? searchParams.get("successful") === "true" : undefined;

        // If admin, allow fetching any user's query history
        // If regular user, only allow fetching their own query history
        if (session.user.role !== "ADMIN" && userId !== session.user.id) {
            return NextResponse.json({ error: "unauthorized: can only access your own query history" }, { status: 403 });
        }

        // Build the query filter
        const where = {
            userId: userId || session.user.id,
            ...(successful !== undefined ? { successful } : {})
        };

        // Get paginated query history
        const [queries, total] = await Promise.all([
            prisma.queryHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    visualization: true
                }
            }),
            prisma.queryHistory.count({ where })
        ]);

        return NextResponse.json({
            queries,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "error fetching query history" }, { status: 500 });
    }
};

// Save a new query to history
export const POST = async (req: NextRequest) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const {
            userQuery,
            sqlQuery,
            relatedQueries,
            results,
            executionTime,
            successful,
            errorMessage,
            visualization,
            userId // Even if this is passed, we'll ignore it
        } = await req.json();

        if (!userQuery || !sqlQuery) {
            return NextResponse.json({ error: "userQuery and sqlQuery are required" }, { status: 400 });
        }

        // Create the query history with optional visualization, always using the authenticated user's ID
        const queryHistory = await prisma.queryHistory.create({
            data: {
                userId: session.user.id, // Force using authenticated user's ID
                userQuery,
                sqlQuery,
                relatedQueries,
                results,
                executionTime,
                successful: successful ?? true,
                errorMessage,
                visualization: visualization ? {
                    create: {
                        chartType: visualization.chartType,
                        chartOptions: visualization.chartOptions,
                        title: visualization.title,
                        description: visualization.description
                    }
                } : undefined
            },
            include: {
                visualization: true
            }
        });

        return NextResponse.json(queryHistory, { status: 201 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "error saving query history" }, { status: 500 });
    }
};

// Update an existing query history entry (primarily for updating visualization)
export const PUT = async (req: NextRequest) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const {
            id,
            userQuery,
            sqlQuery,
            relatedQueries,
            results,
            executionTime,
            successful,
            errorMessage,
            visualization
        } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "query history id is required" }, { status: 400 });
        }

        // Check if the query exists and belongs to the user
        const existingQuery = await prisma.queryHistory.findUnique({
            where: { id },
            include: { visualization: true }
        });

        if (!existingQuery) {
            return NextResponse.json({ error: "query history not found" }, { status: 404 });
        }

        // Check authorization - only admin or the query owner can update
        if (session.user.role !== "ADMIN" && existingQuery.userId !== session.user.id) {
            return NextResponse.json({ error: "unauthorized: can only update your own query history" }, { status: 403 });
        }

        // Update the query history with transactions to handle visualization updates
        const updatedQuery = await prisma.$transaction(async (tx) => {
            // Update the query history
            const updated = await tx.queryHistory.update({
                where: { id },
                data: {
                    userQuery: userQuery || existingQuery.userQuery,
                    sqlQuery: sqlQuery || existingQuery.sqlQuery,
                    relatedQueries: relatedQueries || existingQuery.relatedQueries,
                    results: results || existingQuery.results,
                    executionTime: executionTime || existingQuery.executionTime,
                    successful: successful !== undefined ? successful : existingQuery.successful,
                    errorMessage: errorMessage || existingQuery.errorMessage
                },
                include: { visualization: true }
            });

            // Handle visualization update
            if (visualization) {
                if (existingQuery.visualization) {
                    // Update existing visualization
                    await tx.visualization.update({
                        where: { id: existingQuery.visualization.id },
                        data: {
                            chartType: visualization.chartType || existingQuery.visualization.chartType,
                            chartOptions: visualization.chartOptions || existingQuery.visualization.chartOptions,
                            title: visualization.title || existingQuery.visualization.title,
                            description: visualization.description || existingQuery.visualization.description
                        }
                    });
                } else {
                    // Create new visualization
                    await tx.visualization.create({
                        data: {
                            queryId: id,
                            chartType: visualization.chartType,
                            chartOptions: visualization.chartOptions,
                            title: visualization.title,
                            description: visualization.description
                        }
                    });
                }
            }

            return updated;
        });

        // Fetch the updated query with visualization included
        const result = await prisma.queryHistory.findUnique({
            where: { id },
            include: { visualization: true }
        });

        return NextResponse.json(result);
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "error updating query history" }, { status: 500 });
    }
};

// Delete a query history entry
export const DELETE = async (req: NextRequest) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "query history id is required" }, { status: 400 });
        }

        // Check if the query exists and belongs to the user
        const existingQuery = await prisma.queryHistory.findUnique({
            where: { id }
        });

        if (!existingQuery) {
            return NextResponse.json({ error: "query history not found" }, { status: 404 });
        }

        // Check authorization - only admin or the query owner can delete
        if (session.user.role !== "ADMIN" && existingQuery.userId !== session.user.id) {
            return NextResponse.json({ error: "unauthorized: can only delete your own query history" }, { status: 403 });
        }
        // Delete the query history (will cascade delete the visualization)
        await prisma.queryHistory.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Query history deleted" });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "error deleting query history" }, { status: 500 });
    }
}; 