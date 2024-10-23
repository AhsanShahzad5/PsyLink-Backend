

import express, { Request, Response } from 'express';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}

export {test}