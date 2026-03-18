import { Hono } from "hono";
import { sign, verify } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { posts } from '../db/schema';
import * as schema from '../db/schema';
import { createBlogInput,updateBlogInput } from "@ronak3333/medium-common";


export const blogRouter = new Hono<{
    Bindings: {
      medium : D1Database
      JWT_SECRET : string
    },
    Variables:{
        userId : string
    }
  }>();


// auth middleware
blogRouter.use("/*", async (c, next) => {
    const authHeader = c.req.header("authorization") || "";

    try {
        const user = await verify(authHeader, c.env.JWT_SECRET);
        console.log("Decoded User:", user);

        if (typeof user === "object" && user !== null && "id" in user && typeof user.id === "string") {
            c.set("userId", user.id);
            await next();
        } else {
            c.status(403);
            return c.json({ message: "Invalid token payload" });
        }
    } catch (e) {
        console.error("JWT Verification Error:", e);
        c.status(403);
        return c.json({ message: "You are not logged in" });
    }
});




// blog routes post
blogRouter.post("/", async (c) => {
    const db = drizzle(c.env.medium);

    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    
    if (!success) {
        c.status(400);
        return c.json({ error: "Invalid input" });
    }

    const authorId = c.get("userId"); 
    console.log("Author ID:", authorId); 

    if (typeof authorId !== "string") {
        c.status(400);
        return c.json({ error: "Invalid author ID" });
    }

    try {
        const result = await db.insert(posts).values({
            id: crypto.randomUUID(),
            title: body.title,
            content: body.content,
            authorId: authorId,
        }).returning({ id: posts.id });

        return c.json({
            id : result[0].id
        });
    } catch (error) {
        console.error("Error creating blog:", error);
        c.status(500);
        return c.json({ error: "Failed to create blog" });
    }
});



// blog routes put
blogRouter.put("/",async(c)=>{
    const db = drizzle(c.env.medium);
    
    const body = await c.req.json()
    const {success} = updateBlogInput.safeParse(body)
    if(!success){
        c.status(400)
        return c.json({error : "Invalid input"})
    }
    const authorId = c.get("userId")
    
    const result = await db.update(posts).set({
        title : body.title,
        content : body.content,
        authorId : authorId
    }).where(eq(posts.id, body.id)).returning({ id: posts.id });
    
    if (result.length === 0) {
        c.status(404);
        return c.json({ error: "Blog not found" });
    }
    return c.json({id : result[0].id})
})

// todo : to add pagination
blogRouter.get("/bulk",async(c)=>{
    const db = drizzle(c.env.medium, { schema });
    
    const allBlogs = await db.query.posts.findMany({
        columns:{
            content : true,
            title : true,
            id : true,
        },
        with: {
            author : {
                columns : {
                    name : true
                }
            }
        }
    });
    
    return c.json<{ blogs: typeof allBlogs }>({ blogs: allBlogs })
})



// blog routes get
blogRouter.get("/:id",async(c)=>{
    const db = drizzle(c.env.medium, { schema });

    const id = c.req.param("id")
    try {
        const blog = await db.query.posts.findFirst({
            where: eq(posts.id, id),
            columns:{
                content : true,
                title : true,
                id : true,
            },
            with: {
                author : {
                    columns : {
                        name : true
                    }
                }
            }
        });
        
        return c.json({blog})
    }catch(e){
        c.status(404)
        return c.json({message : "error while fetching blog"})
    }
    
})