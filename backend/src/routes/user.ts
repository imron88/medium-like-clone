import { Hono } from "hono";
import { sign, verify } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { signupInput,signinInput } from "@ronak3333/medium-common"

export const userRouter = new Hono<{
    Bindings: {
      medium : D1Database
      JWT_SECRET : string
    }
  }>();

// signup route
userRouter.post("/signup",async (c)=>{
  
    const db = drizzle(c.env.medium);
    
    const body = await c.req.json()
    const {success} = signupInput.safeParse(body)
    if(!success){
      c.status(400)
      return c.json({error : "Invalid input"})
    }
    try {
      const result = await db.insert(users).values({
        id: crypto.randomUUID(),
        email : body.email,
        password : body.password,
        name : body.name
      }).returning({ id: users.id });
      
      const user = result[0];
      
      const jwt = await sign({id : user.id},c.env.JWT_SECRET)

      return c.json(jwt)
      
    } catch (error) {
      c.status(403)
      return c.json({message: "User already exists/error while creating user"})
    }
  })
  
  // signin route
  userRouter.post("/signin",async (c)=>{
    const db = drizzle(c.env.medium);
    
    const body = await c.req.json()
    const {success} = signinInput.safeParse(body)
    if(!success){
      c.status(400)
      return c.json({error : "Invalid input"})
    }
    const result = await db.select().from(users).where(eq(users.email, body.email));
    const user = result[0];
    if(!user){
      c.status(403)
      return c.json({error : "user not found"})
    }
    
    const jwt = await sign({id : user.id},c.env.JWT_SECRET)
    return c.json(jwt)
  })